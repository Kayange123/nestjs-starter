import * as Joi from 'joi';

export const appConfigSchema = Joi.object({
  // Application Settings
  APP_NAME: Joi.string().required(),
  APP_DESCRIPTION: Joi.string().required(),
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'staging')
    .default('development'),
  PORT: Joi.number().default(3030),

  // Database Settings
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().required(),
  DB_NAME: Joi.string().required(),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_SYNC: Joi.string().valid('true', 'false').default('false'),
  DB_LOGGING: Joi.string().valid('true', 'false').default('false'),

  // Cache Settings
  CACHE_TTL: Joi.number().default(300), // 5 minutes in seconds

  // Security Settings
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRATION: Joi.string().default('1d'),
  REFRESH_TOKEN_EXPIRATION: Joi.string().default('7d'),
  SESSION_SECRET: Joi.string().required(),

  // Throttling and Rate Limiting
  THROTTLE_TTL: Joi.number().default(60000),
  THROTTLE_LIMIT: Joi.number().default(100),

  // Logging Configuration
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly')
    .default('info'),

  // CORS Configuration
  CORS_ORIGIN: Joi.string().default('*'),

  // File Storage
  FILE_STORAGE_PATH: Joi.string().default('./uploads'),
  MAX_FILE_SIZE: Joi.number().default(10 * 1024 * 1024), // 10MB
});
