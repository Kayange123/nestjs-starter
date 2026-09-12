import { readDatabaseSettings } from './database-config';

const base = {
  DB_HOST: 'localhost',
  DB_PORT: '5432',
  DB_NAME: 'test',
  DB_USER: 'test',
  DB_PASSWORD: 'private-value',
};
describe('database configuration', () => {
  it('requires only DB configuration and defaults to migration-managed public schema', () => {
    expect(readDatabaseSettings(base)).toMatchObject({
      port: 5432,
      schema: 'public',
      sync: false,
      logging: false,
    });
  });
  it('rejects production synchronization', () => {
    expect(() =>
      readDatabaseSettings({
        ...base,
        NODE_ENV: 'production',
        DB_SYNC: 'true',
      }),
    ).toThrow('DB_SYNC');
    expect(
      readDatabaseSettings({
        ...base,
        NODE_ENV: 'production',
        DB_SYNC: 'false',
      }).sync,
    ).toBe(false);
  });
  it.each(['bad-schema', 'public,other', 'public;DROP TABLE users', 'UPPER'])(
    'rejects unsafe schema name %s',
    (DB_SCHEMA) => {
      expect(() => readDatabaseSettings({ ...base, DB_SCHEMA })).toThrow(
        'DB_SCHEMA',
      );
    },
  );
  it('does not include supplied values in validation errors', () => {
    expect(() =>
      readDatabaseSettings({ ...base, DB_PORT: 'private-value' }),
    ).toThrow('Invalid database configuration: DB_PORT');
  });
});
