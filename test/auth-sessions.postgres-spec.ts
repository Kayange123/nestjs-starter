import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import {
  Global,
  INestApplication,
  Logger,
  Module,
  VersioningType,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import { User } from '../src/modules/users/entities/user.entity';
import { Role } from '../src/modules/auth/entities/role.entity';
import { Permission } from '../src/modules/auth/entities/permission.entity';
import { AuthSession } from '../src/modules/auth/entities/auth-session.entity';
import { RefreshToken } from '../src/modules/auth/entities/refresh-token.entity';
import { AuthSessionsService } from '../src/modules/auth/services/auth-sessions.service';
import { AuthService } from '../src/modules/auth/services/auth.service';
import { UsersService } from '../src/modules/users/services/users.service';
import { AppConfigService } from '../src/config/app-config.service';
import { createValidationPipe } from '../src/pipes/validation.pipe';
import { GlobalExceptionFilter } from '../src/filters/global-exception.filter';
import { ResponseInterceptor } from '../src/interceptors/response.interceptor';
import { AuthSessions1789214400000 } from '../src/database/migrations/1789214400000-AuthSessions';

// Real AuthModule, UsersModule, guards, session repository, HTTP routes and PostgreSQL.
describe('Persisted authentication sessions', () => {
  let source: DataSource;
  let app: INestApplication;
  let sessions: AuthSessionsService;
  let auth: AuthService;
  let users: UsersService;
  let user: User;
  let hash: string;
  let tokenSigner: JwtService;
  const password = 'Strong:Password123';
  const schema = `sessions_${randomUUID().replace(/-/g, '')}`;
  const config = {
    auth: {
      secret: 'test-only-auth-secret',
      accessTtlSeconds: 900,
      sessionTtlSeconds: 604800,
      issuer: 'nestjs-starter',
      audience: 'nestjs-api',
      throttleTtlMs: 60000,
      throttleLimit: 5,
    },
  };
  const signing = new JwtService({ secret: config.auth.secret });
  beforeAll(async () => {
    if (!process.env.TEST_DATABASE_URL)
      throw new Error('TEST_DATABASE_URL required');
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    source = new DataSource({
      type: 'postgres',
      url: process.env.TEST_DATABASE_URL,
      schema,
      entities: [User, Role, Permission, AuthSession, RefreshToken],
    });
    await source.initialize();
    await source.query(`CREATE SCHEMA "${schema}"`);
    await source.synchronize();
    // Exercise the delivered migration against a real existing user schema.
    const runner = source.createQueryRunner();
    await runner.connect();
    try {
      await runner.query(`SET search_path TO "${schema}"`);
      const migration = new AuthSessions1789214400000();
      await migration.down(runner);
      await migration.up(runner);
    } finally {
      await runner.query('SET search_path TO public');
      await runner.release();
    }
    // Required config is populated before importing the production module's ConfigModule.
    Object.assign(process.env, {
      APP_NAME: 'test',
      APP_DESCRIPTION: 'test',
      DB_HOST: 'localhost',
      DB_PORT: '5432',
      DB_NAME: 'test',
      DB_USER: 'test',
      DB_PASSWORD: 'test',
      JWT_SECRET: 'test-only-secret-with-at-least-32-characters',
      SESSION_SECRET: 'test-only-session-secret',
      NODE_ENV: 'test',
    });
    const { AuthModule } = await import('../src/modules/auth/auth.module');
    @Global()
    @Module({
      providers: [{ provide: DataSource, useValue: source }],
      exports: [DataSource],
    })
    class TestDatabaseModule {}
    const module = await Test.createTestingModule({
      imports: [TestDatabaseModule, AuthModule],
    })
      .overrideProvider(AppConfigService)
      .useValue(config)
      .compile();
    sessions = module.get(AuthSessionsService);
    tokenSigner = module.get(JwtService);
    auth = module.get(AuthService);
    users = module.get(UsersService);
    app = module.createNestApplication();
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(createValidationPipe());
    app.useGlobalFilters(new GlobalExceptionFilter('production'));
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();
    await app.listen(0, '127.0.0.1');
    hash = await User.hashPassword(password);
  }, 30000);
  beforeEach(async () => {
    const repo = source.getRepository(User);
    user = await repo.save(
      repo.create({
        firstName: 'Auth',
        lastName: 'Test',
        email: `${randomUUID().slice(0, 8)}@test.example`,
        password: hash,
      }),
    );
  });
  afterAll(async () => {
    await app?.close();
    if (source?.isInitialized) {
      try {
        await source.query(`DROP SCHEMA "${schema}" CASCADE`);
      } finally {
        await source.destroy();
      }
    }
    jest.restoreAllMocks();
  });
  const issue = () => sessions.create(user.id, hash);
  const read = (token: string) =>
    request(app.getHttpServer())
      .get(`/v1/users/${user.id}`)
      .set('Authorization', `Bearer ${token}`);

  it('issues short-lived purpose-bound access JWTs and only stores refresh hashes', async () => {
    const pair = await issue();
    const claims = signing.verify(pair.accessToken);
    expect(claims).toMatchObject({
      sub: user.id,
      type: 'access',
      iss: config.auth.issuer,
      aud: config.auth.audience,
    });
    expect(claims.exp - claims.iat).toBe(900);
    expect(pair.refreshToken.split('.')).toHaveLength(2);
    const stored = await source.getRepository(RefreshToken).findOne({
      where: { id: pair.refreshToken.split('.')[0] },
      select: { tokenHash: true },
    });
    expect(stored.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(stored.tokenHash).not.toBe(pair.refreshToken);
    await read(pair.accessToken).expect(200);
    await read(pair.refreshToken).expect(401);
    await expect(sessions.refresh(pair.accessToken)).rejects.toThrow(
      'Invalid refresh token',
    );
  });
  it('rotates refresh credentials and commits family revocation on reuse', async () => {
    const first = await issue();
    const unrelated = await issue();
    const second = await sessions.refresh(first.refreshToken);
    expect(second.refreshToken).not.toBe(first.refreshToken);
    expect(second.accessToken).not.toBe(first.accessToken);
    await read(second.accessToken).expect(200);
    await expect(sessions.refresh(first.refreshToken)).rejects.toThrow();
    await read(second.accessToken).expect(401);
    await expect(sessions.refresh(second.refreshToken)).rejects.toThrow();
    const persisted = await source
      .getRepository(AuthSession)
      .findOneBy({ id: signing.decode(first.accessToken).sid });
    expect(persisted.revokedAt).toBeInstanceOf(Date);
    await read(unrelated.accessToken).expect(200);
  });
  it('serializes concurrent refreshes and revokes the winning token on detected replay', async () => {
    const pair = await issue();
    const outcomes = await Promise.allSettled([
      sessions.refresh(pair.refreshToken),
      sessions.refresh(pair.refreshToken),
    ]);
    const winners = outcomes.filter(
      (outcome) => outcome.status === 'fulfilled',
    );
    expect(winners).toHaveLength(1);
    expect(
      outcomes.filter((outcome) => outcome.status === 'rejected'),
    ).toHaveLength(1);
    await read(winners[0].value.accessToken).expect(401);
  });
  it('does not revoke a session when an attacker guesses the secret for a known token ID', async () => {
    const pair = await issue();
    const forged = pair.refreshToken.split('.')[0] + '.' + 'A'.repeat(43);
    await expect(sessions.refresh(forged)).rejects.toThrow();
    await read(pair.accessToken).expect(200);
    await sessions.refresh(pair.refreshToken);
  });
  it('rejects expired sessions and expired access tokens', async () => {
    const pair = await issue();
    const claims = signing.decode(pair.accessToken);
    const expiredAccess = signing.sign(
      { sub: user.id, sid: claims.sid, type: 'access' },
      {
        issuer: config.auth.issuer,
        audience: config.auth.audience,
        expiresIn: -1,
      },
    );
    await read(expiredAccess).expect(401);
    await source
      .getRepository(AuthSession)
      .update(claims.sid, { expiresAt: new Date(Date.now() - 1000) });
    await expect(sessions.refresh(pair.refreshToken)).rejects.toThrow();
    await read(pair.accessToken).expect(401);
  });
  it('rejects legacy JWTs, wrong purpose, issuer, audience and algorithms', async () => {
    const pair = await issue();
    const base = {
      sub: user.id,
      sid: signing.decode(pair.accessToken).sid,
      type: 'access',
    };
    for (const token of [
      signing.sign({ sub: user.id }),
      signing.sign(base, {
        issuer: config.auth.issuer,
        audience: config.auth.audience,
      }),
      signing.sign(
        { ...base, sub: user.id + 10000 },
        {
          issuer: config.auth.issuer,
          audience: config.auth.audience,
          expiresIn: 900,
        },
      ),
      signing.sign(
        { ...base, type: 'refresh' },
        {
          issuer: config.auth.issuer,
          audience: config.auth.audience,
          expiresIn: 900,
        },
      ),
      signing.sign(base, {
        issuer: 'wrong',
        audience: config.auth.audience,
        expiresIn: 900,
      }),
      signing.sign(base, {
        issuer: config.auth.issuer,
        audience: 'wrong',
        expiresIn: 900,
      }),
      signing.sign(base, {
        issuer: config.auth.issuer,
        audience: config.auth.audience,
        algorithm: 'HS384',
        expiresIn: 900,
      }),
    ])
      await read(token).expect(401);
  });
  it('logout revokes only the current login session', async () => {
    const first = await issue();
    const second = await issue();
    await request(app.getHttpServer())
      .post('/v1/auth/logout')
      .set('Authorization', `Bearer ${first.accessToken}`)
      .expect(204);
    await read(first.accessToken).expect(401);
    await expect(sessions.refresh(first.refreshToken)).rejects.toThrow();
    await read(second.accessToken).expect(200);
  });
  it('atomically revokes every session on password change', async () => {
    const first = await issue();
    const second = await issue();
    await request(app.getHttpServer())
      .patch(`/v1/users/${user.id}`)
      .set('Authorization', `Bearer ${first.accessToken}`)
      .send({ password: 'Changed:Password123' })
      .expect(200);
    await read(first.accessToken).expect(401);
    await read(second.accessToken).expect(401);
    await expect(sessions.refresh(first.refreshToken)).rejects.toThrow();
    await expect(sessions.create(user.id, hash)).rejects.toThrow(
      'Invalid credentials',
    );
    const fresh = await auth.login({
      userName: user.email,
      password: 'Changed:Password123',
    });
    await read(fresh.accessToken).expect(200);
  });
  it('does not let concurrent refresh survive a password change', async () => {
    const pair = await issue();
    const [rotated] = await Promise.allSettled([
      sessions.refresh(pair.refreshToken),
      users.update(user.id, { password: 'Changed:Password123' }),
    ]);
    await read(pair.accessToken).expect(401);
    if (rotated.status === 'fulfilled')
      await read(rotated.value.accessToken).expect(401);
  });
  it('rolls back password changes if session revocation fails', async () => {
    const pair = await issue();
    await source.query(
      `CREATE FUNCTION "${schema}".reject_revocation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test revocation failure'; END $$`,
    );
    await source.query(
      `CREATE TRIGGER reject_revocation BEFORE UPDATE ON "${schema}".auth_sessions FOR EACH ROW WHEN (OLD."userId" = ${user.id}) EXECUTE FUNCTION "${schema}".reject_revocation()`,
    );
    try {
      await expect(
        users.update(user.id, { password: 'Changed:Password123' }),
      ).rejects.toThrow('test revocation failure');
      expect(
        await (
          await users.findByEmailOrPhoneNumber(user.email)
        ).verifyPassword(password),
      ).toBe(true);
      await read(pair.accessToken).expect(200);
    } finally {
      await source.query(
        `DROP TRIGGER reject_revocation ON "${schema}".auth_sessions`,
      );
      await source.query(`DROP FUNCTION "${schema}".reject_revocation()`);
    }
  });
  it('does not consume a refresh token when issuance fails', async () => {
    const pair = await issue();
    const spy = jest.spyOn(tokenSigner, 'sign').mockImplementationOnce(() => {
      throw new Error('test signing failure');
    });
    try {
      await expect(sessions.refresh(pair.refreshToken)).rejects.toThrow(
        'test signing failure',
      );
    } finally {
      spy.mockRestore();
    }
    const rotated = await sessions.refresh(pair.refreshToken);
    await read(rotated.accessToken).expect(200);
  });
  it('prevents stale verified credentials from creating a session after a password change', async () => {
    const [created, changed] = await Promise.allSettled([
      sessions.create(user.id, hash),
      users.update(user.id, { password: 'Changed:Password123' }),
    ]);
    expect(changed.status).toBe('fulfilled');
    if (created.status === 'fulfilled')
      await read(created.value.accessToken).expect(401);
    await expect(sessions.create(user.id, hash)).rejects.toThrow(
      'Invalid credentials',
    );
  });
  it('leaves unrelated sessions valid after a profile-only update', async () => {
    const pair = await issue();
    await users.update(user.id, { firstName: 'Updated' });
    await read(pair.accessToken).expect(200);
  });
  it('rejects soft-deleted users with 401', async () => {
    const pair = await issue();
    await users.remove(user.id);
    await read(pair.accessToken).expect(401);
    await expect(sessions.refresh(pair.refreshToken)).rejects.toThrow();
  });
  it('supports HTTP login and refresh with the documented envelopes', async () => {
    const loggedIn = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ userName: user.email, password })
      .expect(201);
    const refreshed = await request(app.getHttpServer())
      .post('/v1/auth/refresh')
      .send({ refreshToken: loggedIn.body.data.refreshToken })
      .expect(200);
    expect(refreshed.body.data.expiresIn).toBeGreaterThan(0);
    await read(refreshed.body.data.accessToken).expect(200);
    const logs = JSON.stringify([
      ...(Logger.prototype.log as jest.Mock).mock.calls,
      ...(Logger.prototype.warn as jest.Mock).mock.calls,
    ]);
    expect(logs).toContain('auth.refresh.rotated');
    expect(logs).not.toContain(password);
    expect(logs).not.toContain(loggedIn.body.data.accessToken);
    expect(logs).not.toContain(loggedIn.body.data.refreshToken);
    expect(logs).not.toContain(refreshed.body.data.refreshToken);
    await request(app.getHttpServer())
      .post('/v1/auth/refresh')
      .send({ refreshToken: 'invalid', extra: true })
      .expect(400);
    await request(app.getHttpServer())
      .post('/v1/auth/refresh')
      .send({ refreshToken: 'invalid' })
      .expect(401);
  });
  it('enforces the configured per-route authentication throttle', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++)
      statuses.push(
        (
          await request(app.getHttpServer())
            .post('/v1/auth/login')
            .send({ userName: 'missing@test.example', password })
        ).status,
      );
    expect(statuses).toContain(401);
    expect(statuses[statuses.length - 1]).toBe(429);
  });
});
