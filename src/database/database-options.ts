import { join } from 'path';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { DatabaseSettings } from '../config/database-config';
import { User } from '../modules/users/entities/user.entity';
import { Role } from '../modules/auth/entities/role.entity';
import { Permission } from '../modules/auth/entities/permission.entity';
import { AuthSession } from '../modules/auth/entities/auth-session.entity';
import { RefreshToken } from '../modules/auth/entities/refresh-token.entity';

export const BASE_ENTITIES = [User, Role, Permission];
export function databaseOptions(
  config: DatabaseSettings,
): PostgresConnectionOptions {
  return {
    type: 'postgres',
    host: config.host,
    port: config.port,
    username: config.user,
    password: config.password,
    database: config.name,
    schema: config.schema,
    entities: [...BASE_ENTITIES, AuthSession, RefreshToken],
    migrations: [
      join(
        __dirname,
        'migrations',
        `[0-9]*.${__filename.endsWith('.ts') ? 'ts' : 'js'}`,
      ),
    ],
    migrationsTableName: 'migrations',
    migrationsRun: false,
    migrationsTransactionMode: 'all',
    synchronize: config.sync,
    logging: config.logging,
    // DB_SCHEMA is strictly validated before reaching this connection option.
    extra: { options: `-c search_path=${config.schema}` },
  };
}
