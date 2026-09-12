import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { User } from '../src/modules/users/entities/user.entity';
import { Role } from '../src/modules/auth/entities/role.entity';
import { Permission } from '../src/modules/auth/entities/permission.entity';
import { UsersService } from '../src/modules/users/services/users.service';
import {
  UserQueryDto,
  UserSortField,
  SortOrder,
} from '../src/modules/users/dto/user-query.dto';
import { createValidationPipe } from '../src/pipes/validation.pipe';
import { mapUserQuery } from '../src/modules/users/repositories/user-query.mapper';

// Explicit opt-in command: each run owns a random schema and removes only that schema.
describe('User pagination against PostgreSQL', () => {
  let source: DataSource;
  let service: UsersService;
  const schema = `pagination_${randomUUID().replace(/-/g, '')}`;
  beforeAll(async () => {
    if (!process.env.TEST_DATABASE_URL)
      throw new Error(
        'TEST_DATABASE_URL is required for PostgreSQL integration tests',
      );
    source = new DataSource({
      type: 'postgres',
      url: process.env.TEST_DATABASE_URL,
      schema,
      entities: [User, Role, Permission],
      synchronize: false,
    });
    await source.initialize();
    await source.query(`CREATE SCHEMA "${schema}"`);
    await source.synchronize();
    const repository = source.getRepository(User);
    service = new UsersService(repository);
    for (let id = 1; id <= 30; id++) {
      await repository.save(
        repository.create({
          id,
          firstName: id <= 25 ? 'Match' : 'Outside',
          lastName: 'User',
          email: `u${id}@example.com`,
          password: 'not-used-for-login',
          createdAt: new Date(
            id <= 25 ? '2026-01-02T00:00:00Z' : '2025-01-01T00:00:00Z',
          ),
        }),
      );
    }
    for (const [id, firstName, date, deleted] of [
      [31, 'literal%', '2026-02-01', false],
      [32, 'literalX', '2026-02-01', false],
      [33, 'Match', '2026-01-02', true],
      [34, 'Future', '2101-01-01', false],
      [35, 'Past', '1960-01-01', false],
    ] as const) {
      await repository.save(
        repository.create({
          id,
          firstName,
          lastName: 'User',
          email: `u${id}@example.com`,
          password: 'not-used-for-login',
          createdAt: new Date(date),
          deletedAt: deleted ? new Date() : undefined,
        }),
      );
    }
  }, 30000);
  afterAll(async () => {
    if (source?.isInitialized) {
      try {
        await source.query(`DROP SCHEMA "${schema}" CASCADE`);
      } finally {
        await source.destroy();
      }
    }
  });
  async function query(
    input: Record<string, string> = {},
  ): Promise<UserQueryDto> {
    return createValidationPipe().transform(input, {
      type: 'query',
      metatype: UserQueryDto,
    });
  }
  it('filters before pagination and counts matching rows excluding soft-deleted users', async () => {
    const result = await service.findAll(
      await query({
        q: 'mAtCh',
        page: '2',
        limit: '10',
        createdFrom: '2026-01-01T00:00:00Z',
        createdTo: '2026-01-03T00:00:00Z',
      }),
    );
    expect(result.data.map((user) => user.id)).toEqual([
      15, 14, 13, 12, 11, 10, 9, 8, 7, 6,
    ]);
    expect(result.pagination).toEqual({
      page: 2,
      limit: 10,
      totalItems: 25,
      totalPages: 3,
      hasNextPage: true,
      hasPreviousPage: true,
    });
    expect(result.data.every((user) => !('password' in user))).toBe(true);
  });
  it('searches last name and email with the same inclusive date constraints', async () => {
    const lastName = await service.findAll(
      await query({
        q: 'USER',
        createdFrom: '2026-01-02T00:00:00Z',
        createdTo: '2026-01-02T00:00:00Z',
      }),
    );
    expect(lastName.pagination.totalItems).toBe(25);
    const email = await service.findAll(
      await query({ q: 'U1@EXAMPLE', createdFrom: '2026-01-02T00:00:00Z' }),
    );
    expect(email.data.map((user) => user.id)).toEqual([1]);
    const excluded = await service.findAll(
      await query({ q: 'outside', createdFrom: '2026-01-02T00:00:00Z' }),
    );
    expect(excluded.pagination.totalItems).toBe(0);
  });
  it('uses a deterministic tie-breaker across adjacent pages', async () => {
    const first = await service.findAll(await query({ q: 'match' }));
    const second = await service.findAll(
      await query({ q: 'match', page: '2' }),
    );
    expect(first.data.map((user) => user.id)).toEqual([
      25, 24, 23, 22, 21, 20, 19, 18, 17, 16,
    ]);
    expect(
      new Set([...first.data, ...second.data].map((user) => user.id)).size,
    ).toBe(20);
  });
  it.each(Object.values(UserSortField))(
    'allows sorting by %s in both directions',
    async (sortBy) => {
      for (const order of [SortOrder.ASC, SortOrder.DESC]) {
        const result = await service.findAll(
          await query({ q: 'match', sortBy, order, limit: '100' }),
        );
        const expected = [...result.data].sort((a, b) => {
          const av = a[sortBy],
            bv = b[sortBy];
          const primary = av < bv ? -1 : av > bv ? 1 : 0;
          return (primary || a.id - b.id) * (order === SortOrder.ASC ? 1 : -1);
        });
        expect(result.data.map((user) => user.id)).toEqual(
          expected.map((user) => user.id),
        );
      }
    },
  );
  it('treats LIKE wildcards and SQL syntax as literal search text', async () => {
    const literal = await service.findAll(await query({ q: 'literal%' }));
    expect(literal.data.map((user) => user.id)).toEqual([31]);
    expect(
      (await service.findAll(await query({ q: "' OR 1=1 --" }))).pagination
        .totalItems,
    ).toBe(0);
  });
  it('does not impose implicit now/epoch bounds for one-sided dates', async () => {
    expect(
      (
        await service.findAll(
          await query({ createdFrom: '2100-01-01T00:00:00Z' }),
        )
      ).data.map((user) => user.id),
    ).toEqual([34]);
    expect(
      (
        await service.findAll(
          await query({ createdTo: '1970-01-01T00:00:00Z' }),
        )
      ).data.map((user) => user.id),
    ).toEqual([35]);
  });
  it('returns accurate final-page and empty-page metadata', async () => {
    const last = await service.findAll(await query({ q: 'match', page: '3' }));
    expect(last.data).toHaveLength(5);
    expect(last.pagination.hasNextPage).toBe(false);
    const empty = await service.findAll(await query({ q: 'not-present' }));
    expect(empty).toEqual({
      data: [],
      pagination: {
        page: 1,
        limit: 10,
        totalItems: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });
  });
  it('uses parameter binding instead of interpolating search text into SQL', async () => {
    const needle = "' OR 1=1 --";
    const [sql, parameters] = source
      .getRepository(User)
      .createQueryBuilder('user')
      .setFindOptions(mapUserQuery(await query({ q: needle })))
      .getQueryAndParameters();
    expect(sql).not.toContain(needle);
    expect(parameters).toContain(`%${needle}%`);
  });
});
