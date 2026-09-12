import { DatabaseCommandError } from '../database/command-error';
import * as Joi from 'joi';
import { existsSync } from 'fs';
import { loadEnvFile } from 'node:process';

export const databaseConfigFields = {
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().integer().min(1).max(65535).required(),
  DB_NAME: Joi.string().required(),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_SCHEMA: Joi.string()
    .pattern(/^[a-z_][a-z0-9_]{0,62}$/)
    .default('public'),
  DB_SYNC: Joi.string()
    .valid('true', 'false')
    .default('false')
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.valid(Joi.override, 'false'),
    }),
  DB_LOGGING: Joi.string().valid('true', 'false').default('false'),
};

export interface DatabaseSettings {
  host: string;
  port: number;
  name: string;
  user: string;
  password: string;
  schema: string;
  sync: boolean;
  logging: boolean;
}

export function readDatabaseSettings(
  env: NodeJS.ProcessEnv = process.env,
): DatabaseSettings {
  const { value, error } = Joi.object({
    NODE_ENV: Joi.string()
      .valid('development', 'test', 'staging', 'production')
      .default('development'),
    ...databaseConfigFields,
  })
    .unknown(true)
    .validate(env, { abortEarly: false });
  if (error)
    throw new DatabaseCommandError(
      `Invalid database configuration: ${error.details.map((detail) => detail.path.join('.')).join(', ')}`,
    );
  return {
    host: value.DB_HOST,
    port: value.DB_PORT,
    name: value.DB_NAME,
    user: value.DB_USER,
    password: value.DB_PASSWORD,
    schema: value.DB_SCHEMA,
    sync: value.DB_SYNC === 'true',
    logging: value.DB_LOGGING === 'true',
  };
}

/** CLI needs database configuration only, not application JWT/session secrets. */
export function loadDatabaseSettings(): DatabaseSettings {
  if (existsSync('.env')) loadEnvFile('.env');
  return readDatabaseSettings();
}
