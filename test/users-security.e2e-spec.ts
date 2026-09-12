import { DocumentBuilder, SwaggerModule, OpenAPIObject } from '@nestjs/swagger';
import { INestApplication, Logger, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppConfigService } from '../src/config/app-config.service';
import { AuthSessionsService } from '../src/modules/auth/services/auth-sessions.service';
import { randomUUID, randomBytes } from 'crypto';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as request from 'supertest';
import { UsersController } from '../src/modules/users/controllers/users.controller';
import { UsersService } from '../src/modules/users/services/users.service';
import { User } from '../src/modules/users/entities/user.entity';
import { Role } from '../src/modules/auth/entities/role.entity';
import { AuthController } from '../src/modules/auth/controllers/auth.controller';
import { AuthService } from '../src/modules/auth/services/auth.service';
import { JwtStrategy } from '../src/modules/auth/strategies/jwt.strategy';
import { createValidationPipe } from '../src/pipes/validation.pipe';
import { GlobalExceptionFilter } from '../src/filters/global-exception.filter';
import { ResponseInterceptor } from '../src/interceptors/response.interceptor';
import { RequestsInterceptor } from '../src/interceptors/requests.interceptor';

// Real controllers, user services and guards; persistence and session service are mocked.
// Persisted session lifecycle is covered by auth-sessions.postgres-spec.ts.
describe('User security HTTP regressions', () => {
  let app: INestApplication;
  let openApi: OpenAPIObject;
  let jwt: JwtService;
  let users: User[];
  const repository = {
    manager: { transaction: jest.fn() },
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    findAndCount: jest.fn(),
    softRemove: jest.fn(),
  };
  const sessions = {
    create: jest.fn(),
    isActive: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
  };
  const password = 'Secret:Password123';
  let logSpy: jest.SpyInstance;
  beforeAll(async () => {
    logSpy = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    const module = await Test.createTestingModule({
      imports: [
        PassportModule,
        JwtModule.register({ secret: 'test-only-secret' }),
        ThrottlerModule.forRoot([{ ttl: 60000, limit: 1000 }]),
      ],
      controllers: [UsersController, AuthController],
      providers: [
        UsersService,
        AuthService,
        JwtStrategy,
        {
          provide: AppConfigService,
          useValue: {
            auth: {
              secret: 'test-only-secret',
              issuer: 'nestjs-starter',
              audience: 'nestjs-api',
            },
          },
        },
        { provide: AuthSessionsService, useValue: sessions },
        { provide: getRepositoryToken(User), useValue: repository },
      ],
    }).compile();
    jwt = module.get(JwtService);
    app = module.createNestApplication();

    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(createValidationPipe());
    app.useGlobalFilters(new GlobalExceptionFilter('production'));
    app.useGlobalInterceptors(
      new ResponseInterceptor(),
      new RequestsInterceptor(),
    );
    await app.init();
    await app.listen(0, '127.0.0.1');
    openApi = SwaggerModule.createDocument(app, new DocumentBuilder().build());
  });
  beforeEach(async () => {
    jest.clearAllMocks();
    repository.manager.transaction.mockImplementation(async (work) =>
      work({ getRepository: () => repository, update: jest.fn() }),
    );
    sessions.isActive.mockResolvedValue(true);
    sessions.create.mockImplementation(async (id) => ({
      accessToken: token(id),
      refreshToken: `${randomUUID()}.${randomBytes(32).toString('base64url')}`,
      expiresIn: 900,
    }));
    users = [1, 2, 3].map((id) =>
      Object.assign(new User(), {
        id,
        firstName: 'Test',
        lastName: 'User',
        email: `user${id}@example.com`,
        roles: id === 3 ? [Object.assign(new Role(), { name: 'Admin' })] : [],
        password: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );
    users[0].password = await User.hashPassword(password);
    repository.findOne.mockImplementation(async ({ where }) => {
      const clauses = Array.isArray(where) ? where : [where];
      return (
        users.find((user) =>
          clauses.some((clause) =>
            Object.entries(clause).every(([key, value]) => user[key] === value),
          ),
        ) ?? null
      );
    });
    repository.create.mockImplementation((data) =>
      Object.assign(new User(), data),
    );
    repository.save.mockImplementation(async (user) => {
      if (!user.id) {
        user.id = users.length + 1;
        users.push(user);
      }
      return user;
    });
    repository.findAndCount.mockImplementation(async () => [
      users,
      users.length,
    ]);
  });
  afterAll(async () => {
    await app?.close();
    logSpy?.mockRestore();
  });
  const token = (id: number) =>
    jwt.sign(
      { sub: id, sid: randomUUID(), type: 'access' },
      { issuer: 'nestjs-starter', audience: 'nestjs-api', expiresIn: 900 },
    );
  it('requires authentication', async () => {
    await request(app.getHttpServer()).get('/v1/users/1').expect(401);
  });
  it.each(['get', 'patch'])(
    'forbids cross-user %s before persistence writes',
    async (method) => {
      const response = await request(app.getHttpServer())
        [method]('/v1/users/2')
        .set('Authorization', `Bearer ${token(1)}`)
        .send(method === 'patch' ? { firstName: 'Taken' } : undefined)
        .expect(403);
      expect(response.body.statusCode).toBe(403);
      expect(repository.save).not.toHaveBeenCalled();
    },
  );
  it('allows owner read without leaking secrets or requiring User-Agent', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/users/1')
      .unset('User-Agent')
      .set('Authorization', `Bearer ${token(1)}`)
      .expect(200);
    expect(response.body.data).toMatchObject({ id: 1, roles: [] });
    expect(response.body.data).not.toHaveProperty('password');
  });
  it('allows administrator cross-user update', async () => {
    await request(app.getHttpServer())
      .patch('/v1/users/2')
      .set('Authorization', `Bearer ${token(3)}`)
      .send({ firstName: 'Allowed' })
      .expect(200);
    expect(users[1].firstName).toBe('Allowed');
  });
  it('enforces admin list access and sanitizes each result', async () => {
    await request(app.getHttpServer())
      .get('/v1/users')
      .set('Authorization', `Bearer ${token(1)}`)
      .expect(403);
    const response = await request(app.getHttpServer())
      .get('/v1/users')
      .set('Authorization', `Bearer ${token(3)}`)
      .expect(200);
    expect(response.body.data).toHaveLength(3);
    expect(JSON.stringify(response.body)).not.toContain('password');
    expect(response.body.pagination.totalItems).toBe(3);
  });
  it.each(['abc', '0', '-1', '1.5', '9007199254740992'])(
    'rejects invalid ID %s',
    async (id) => {
      await request(app.getHttpServer())
        .get(`/v1/users/${id}`)
        .set('Authorization', `Bearer ${token(1)}`)
        .expect(400);
    },
  );
  it.each([
    { roles: [{ name: 'Admin' }] },
    { email: 'invalid' },
    { firstName: null },
    { password: null },
    { firstName: 123 },
  ])('rejects unsafe or invalid patches %j', async (body) => {
    const response = await request(app.getHttpServer())
      .patch('/v1/users/1')
      .set('Authorization', `Bearer ${token(1)}`)
      .send(body)
      .expect(400);
    expect(response.body.statusCode).toBe(400);
    expect(repository.save).not.toHaveBeenCalled();
  });
  it('registers an email-only user then authenticates the new password', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({
        firstName: 'New',
        lastName: 'User',
        email: 'new@example.com',
        password,
      })
      .expect(201);
    expect(response.body.data.accessToken).toBeDefined();
    expect(users[3].publicUserId).toBeDefined();
    await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ userName: 'new@example.com', password })
      .expect(201);
  });
  it('authenticates after a password change and rejects the old password', async () => {
    await request(app.getHttpServer())
      .patch('/v1/users/1')
      .set('Authorization', `Bearer ${token(1)}`)
      .send({ password: 'Changed:Password123' })
      .expect(200);
    await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ userName: 'user1@example.com', password: 'Changed:Password123' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ userName: 'user1@example.com', password })
      .expect(401);
  });
  it.each([
    'page=0',
    'page=-1',
    'page=abc',
    'page=1.5',
    'page=1e2',
    'page=0x10',
    'page=',
    'page=1&page=2',
    'limit=0',
    'limit=-1',
    'limit=101',
    'limit=10000',
    'limit=2.5',
    'all=true',
    'all=false',
    'fields=password',
    'fields=id,email',
    'sorts[0][field]=email',
    'sortBy=password',
    'sortBy=refreshTokenHash',
    'sortBy=whatever',
    'order=sideways',
    'createdFrom=invalid',
    'createdFrom=2026-02-30T00:00:00Z',
    'createdFrom=2026-01-01',
    'createdFrom=2026-01-01T00:00:00',
    'createdFrom=2026-02-01T00:00:00Z&createdTo=2026-01-01T00:00:00Z',
    'dateRange[from]=2026-01-01',
    'searchFields=password',
    'status=active',
    'relations=roles',
  ])('rejects unsafe or invalid user query %s', async (query) => {
    await request(app.getHttpServer())
      .get(`/v1/users?${query}`)
      .set('Authorization', `Bearer ${token(3)}`)
      .expect(400);
    expect(repository.findAndCount).not.toHaveBeenCalled();
  });
  it('documents allowed query parameters and the pagination response', () => {
    const operation = openApi.paths['/v1/users'].get;
    const parameters = operation.parameters.filter(
      (parameter) => 'name' in parameter,
    );
    expect(parameters.map((parameter) => parameter.name)).toEqual(
      expect.arrayContaining([
        'page',
        'limit',
        'q',
        'sortBy',
        'order',
        'createdFrom',
        'createdTo',
      ]),
    );
    expect(parameters.map((parameter) => parameter.name)).not.toEqual(
      expect.arrayContaining(['all']),
    );
    expect(
      parameters.find((parameter) => parameter.name === 'limit').schema,
    ).toMatchObject({ maximum: 100, minimum: 1, default: 10 });
    expect(
      parameters.find((parameter) => parameter.name === 'sortBy').schema,
    ).toMatchObject({
      enum: ['id', 'firstName', 'lastName', 'email', 'createdAt'],
    });
    expect(openApi.components.schemas.PaginatedUsersResponseDto).toHaveProperty(
      'properties.pagination',
    );
  });
  it('applies bounded defaults and stable sorting', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/users')
      .set('Authorization', `Bearer ${token(3)}`)
      .expect(200);
    expect(repository.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 10,
        skip: 0,
        order: { createdAt: 'DESC', id: 'DESC' },
      }),
    );
    expect(response.body.pagination).toMatchObject({ page: 1, limit: 10 });
  });
  it('accepts the maximum page size and explicit sorting', async () => {
    await request(app.getHttpServer())
      .get('/v1/users?page=2&limit=100&sortBy=email&order=ASC')
      .set('Authorization', `Bearer ${token(3)}`)
      .expect(200);
    expect(repository.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 100,
        skip: 100,
        order: { email: 'ASC', id: 'ASC' },
      }),
    );
  });
  it('requires an administrator to create and delete users', async () => {
    const body = {
      firstName: 'New',
      lastName: 'User',
      email: 'adminmade@example.com',
      password,
    };
    await request(app.getHttpServer())
      .post('/v1/users')
      .set('Authorization', `Bearer ${token(1)}`)
      .send(body)
      .expect(403);
    const created = await request(app.getHttpServer())
      .post('/v1/users')
      .set('Authorization', `Bearer ${token(3)}`)
      .send(body)
      .expect(201);
    expect(created.body.data).not.toHaveProperty('password');
    await request(app.getHttpServer())
      .delete('/v1/users/2')
      .set('Authorization', `Bearer ${token(1)}`)
      .expect(403);
    await request(app.getHttpServer())
      .delete('/v1/users/2')
      .set('Authorization', `Bearer ${token(3)}`)
      .expect(200);
    expect(repository.softRemove).toHaveBeenCalled();
  });
  it('returns 404 for an authorized read of a missing account', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/users/999')
      .set('Authorization', `Bearer ${token(3)}`)
      .expect(404);
    expect(response.body.statusCode).toBe(404);
  });
  it('rejects role injection during registration', async () => {
    await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({
        firstName: 'New',
        lastName: 'User',
        email: 'new@example.com',
        password,
        roles: [{ name: 'Admin' }],
      })
      .expect(400);
    expect(repository.save).not.toHaveBeenCalled();
  });
  it('does not log passwords, token bodies, cookies or authorization headers', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .set('Cookie', 'secret-cookie=value')
      .set('Authorization', 'Bearer secret-header')
      .send({ userName: 'user1@example.com', password })
      .expect(201);
    const output = JSON.stringify(logSpy.mock.calls);
    expect(logSpy).toHaveBeenCalled();
    expect(output).toContain('durationMs');
    expect(output).not.toContain(password);
    expect(output).not.toContain(response.body.data.accessToken);
    expect(output).not.toContain(response.body.data.refreshToken);
    expect(output).not.toContain('secret-cookie');
    expect(output).not.toContain('secret-header');
  });
});
