import { databaseConfigFields } from './database-config';
import * as Joi from 'joi';

export const appConfigSchema = Joi.object({
  // Application Settings
  APP_NAME: Joi.string().required(),
  APP_DESCRIPTION: Joi.string().required(),
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'staging')
    .default('development'),
  PORT: Joi.number().integer().min(1).max(65535).default(3030),

  ...databaseConfigFields,

  // Cache Settings
  CACHE_TTL: Joi.number().integer().min(0).max(86400).default(300), // 5 minutes in seconds

  // Security Settings
  JWT_SECRET: Joi.string()
    .min(32)
    .pattern(/^(?!.*(?:your-super-secret|change-in-production)).*$/)
    .required(),
  JWT_ACCESS_TTL_SECONDS: Joi.number().integer().min(60).max(3600).default(900),
  AUTH_SESSION_TTL_SECONDS: Joi.number()
    .integer()
    .min(3600)
    .max(2592000)
    .default(604800),
  JWT_ISSUER: Joi.string().default('nestjs-starter'),
  JWT_AUDIENCE: Joi.string().default('nestjs-api'),
  AUTH_THROTTLE_TTL_MS: Joi.number().integer().min(1000).default(60000),
  AUTH_THROTTLE_LIMIT: Joi.number().integer().min(1).max(100).default(5),
  BODY_LIMIT_BYTES: Joi.number()
    .integer()
    .min(1024)
    .max(1048576)
    .default(65536),
  SWAGGER_ENABLED: Joi.string()
    .valid('true', 'false')
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.valid(Joi.override, 'false').default('false'),
      otherwise: Joi.optional().default('true'),
    }),
  HEALTH_TIMEOUT_MS: Joi.number().integer().min(100).max(10000).default(1000),

  // Throttling and Rate Limiting
  THROTTLE_TTL: Joi.number().integer().min(1000).max(3600000).default(60000),
  THROTTLE_LIMIT: Joi.number().integer().min(1).max(10000).default(100),

  // Logging Configuration
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly')
    .default('info'),

  // CORS Configuration
  CORS_ORIGIN: Joi.string()
    .allow('')
    .default('')
    .custom((value, helpers) => {
      if (!value) return value;
      const origins = value.split(',').map((origin: string) => origin.trim());
      try {
        if (
          origins.some((origin: string) => {
            const url = new URL(origin);
            return (
              !['http:', 'https:'].includes(url.protocol) ||
              url.origin !== origin
            );
          })
        )
          return helpers.error('any.invalid');
      } catch {
        return helpers.error('any.invalid');
      }
      return origins.join(',');
    }),

  // File Storage
  FILE_STORAGE_PATH: Joi.string().default('./uploads'),
  MAX_FILE_SIZE: Joi.number().default(10 * 1024 * 1024), // 10MB
});
