import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { NestFactory } from '@nestjs/core';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { databaseOptions } from '../src/database/database-options';
import { readDatabaseSettings } from '../src/config/database-config';
import { configureApp } from '../src/configure-app';
import { LoggerService } from '../src/lib/logger/logger.service';

describe('Full application operational HTTP contract', () => {
  let app: INestApplication;
  let setup: DataSource;
  let schema: string;
  let runtime: DataSource;
  let logs: jest.SpyInstance;
  const previous = { ...process.env };
  beforeAll(async () => {
    if (!process.env.TEST_DATABASE_URL)
      throw new Error('TEST_DATABASE_URL required');
    const url = new URL(process.env.TEST_DATABASE_URL);
    schema = `operations_${randomUUID().replace(/-/g, '')}`;
    Object.assign(process.env, {
      NODE_ENV: 'production',
      APP_NAME: 'Operations test',
      APP_DESCRIPTION: 'Test API',
      DB_HOST: url.hostname,
      DB_PORT: url.port || '5432',
      DB_NAME: url.pathname.slice(1),
      DB_USER: decodeURIComponent(url.username),
      DB_PASSWORD: decodeURIComponent(url.password),
      DB_SCHEMA: schema,
      DB_SYNC: 'false',
      DB_LOGGING: 'false',
      JWT_SECRET: randomUUID() + randomUUID(),
      CORS_ORIGIN: 'https://allowed.example',
      SWAGGER_ENABLED: 'false',
      BODY_LIMIT_BYTES: '1024',
      THROTTLE_LIMIT: '3',
      AUTH_THROTTLE_LIMIT: '5',
      LOG_LEVEL: 'error',
    });
    setup = new DataSource(databaseOptions(readDatabaseSettings()));
    await setup.initialize();
    await setup.query(`CREATE SCHEMA "${schema}"`);
    await setup.runMigrations();
    const { AppModule } = await import('../src/app.module');
    app = await NestFactory.create(AppModule, {
      bodyParser: false,
      logger: false,
      abortOnError: false,
    });
    configureApp(app);
    logs = jest
      .spyOn(app.get(LoggerService), 'log')
      .mockImplementation(() => undefined);
    runtime = app.get(DataSource);
    await app.listen(0, '127.0.0.1');
  }, 30000);
  afterAll(async () => {
    await app?.close();
    if (setup?.isInitialized) {
      await setup.query(`DROP SCHEMA "${schema}" CASCADE`);
      await setup.destroy();
    }
    process.env = previous;
    jest.restoreAllMocks();
  });
  it('returns liveness and bounded database readiness without cookies or internal details', async () => {
    for (const path of ['ping', 'ready', '']) {
      const response = await request(app.getHttpServer())
        .get(`/v1/health/${path}`)
        .expect(200);
      expect(response.body.data.status).toBe('ok');
      expect(response.headers['set-cookie']).toBeUndefined();
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['content-security-policy']).toBeDefined();
      expect(response.headers['x-powered-by']).toBeUndefined();
      expect(response.body.data.database).toBeUndefined();
    }
  });
  it('restricts CORS and permits explicit bearer headers without credentials', async () => {
    const allowed = await request(app.getHttpServer())
      .options('/v1/auth/login')
      .set('Origin', 'https://allowed.example')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'authorization,content-type')
      .expect(204);
    expect(allowed.headers['access-control-allow-origin']).toBe(
      'https://allowed.example',
    );
    expect(allowed.headers['access-control-allow-credentials']).toBeUndefined();
    const denied = await request(app.getHttpServer())
      .get('/v1/health/ping')
      .set('Origin', 'https://denied.example')
      .expect(200);
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });
  it('does not expose production Swagger', async () => {
    await request(app.getHttpServer()).get('/docs').expect(404);
    await request(app.getHttpServer()).get('/docs-json').expect(404);
  });
  it('rejects malformed and excessive bodies before business work', async () => {
    await request(app.getHttpServer())
      .post('/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send('{')
      .expect(400);
    await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ password: 'x'.repeat(2000) })
      .expect(413);
    await request(app.getHttpServer())
      .post('/v1/auth/login')
      .type('form')
      .send({ password: 'x'.repeat(2000) })
      .expect(413);
  });
  it('validates login without requiring a CSRF cookie and never authenticates with cookies', async () => {
    await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({})
      .expect(400);
    await request(app.getHttpServer())
      .post('/v1/auth/logout')
      .set('Cookie', 'access_token=fake; connect.sid=fake')
      .expect(401);
  });
  it('enforces configured global rate limits and ignores spoofed forwarded addresses', async () => {
    for (let i = 0; i < 3; i++)
      await request(app.getHttpServer())
        .get('/v1')
        .set('X-Forwarded-For', `192.0.2.${i + 1}`)
        .expect(200);
    await request(app.getHttpServer())
      .get('/v1')
      .set('X-Forwarded-For', '192.0.2.99')
      .expect(429);
    await request(app.getHttpServer()).get('/v1/health/ping').expect(200);
  });
  it('creates request IDs and logs safe metadata for unmatched and parser failures', async () => {
    logs.mockClear();
    const response = await request(app.getHttpServer())
      .get('/missing-private-identifier?password=private-secret')
      .set('Authorization', 'Bearer private-secret')
      .set('x-request-id', 'untrusted')
      .expect(404);
    expect(response.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    const entries = logs.mock.calls.filter((entry) => entry[1] === 'HTTP');
    expect(entries).toHaveLength(1);
    expect(entries[0][0]).toMatchObject({
      statusCode: 404,
      requestId: response.headers['x-request-id'],
      route: 'unmatched',
    });
    expect(JSON.stringify(entries)).not.toContain('private-');
  });
  it('reports readiness failure while liveness survives and recovers after reconnect', async () => {
    await runtime.destroy();
    const failed = await request(app.getHttpServer())
      .get('/v1/health/ready')
      .expect(503);
    expect(failed.body.message).toBe('Service not ready');
    await request(app.getHttpServer()).get('/v1/health/ping').expect(200);
    await runtime.initialize();
    await request(app.getHttpServer()).get('/v1/health/ready').expect(200);
  });
});
