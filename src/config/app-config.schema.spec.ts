import { appConfigSchema } from './app-config.schema';

const base = {
  APP_NAME: 'test',
  APP_DESCRIPTION: 'test',
  DB_HOST: 'localhost',
  DB_PORT: 5432,
  DB_NAME: 'test',
  DB_USER: 'test',
  DB_PASSWORD: 'test',
  JWT_SECRET: 'test-only-secret-with-at-least-32-characters',
};

describe('authentication configuration', () => {
  it('defaults to short access tokens and a fixed seven-day session', () => {
    const result = appConfigSchema.validate(base);
    expect(result.error).toBeUndefined();
    expect(result.value).toMatchObject({
      JWT_ACCESS_TTL_SECONDS: 900,
      AUTH_SESSION_TTL_SECONDS: 604800,
      JWT_ISSUER: 'nestjs-starter',
      JWT_AUDIENCE: 'nestjs-api',
      AUTH_THROTTLE_LIMIT: 5,
      AUTH_THROTTLE_TTL_MS: 60000,
    });
  });
  it.each([
    ['JWT_ACCESS_TTL_SECONDS', 0],
    ['JWT_ACCESS_TTL_SECONDS', 3601],
    ['JWT_ACCESS_TTL_SECONDS', 60.5],
    ['AUTH_SESSION_TTL_SECONDS', -1],
    ['AUTH_SESSION_TTL_SECONDS', 2592001],
    ['AUTH_THROTTLE_LIMIT', 0],
    ['AUTH_THROTTLE_TTL_MS', 0],
    ['JWT_ISSUER', ''],
    ['JWT_AUDIENCE', ''],
  ])('rejects %s=%s', (name, value) => {
    expect(
      appConfigSchema.validate({ ...base, [name]: value }).error,
    ).toBeDefined();
  });
});

describe('operational configuration', () => {
  it.each([
    ['PORT', 0],
    ['PORT', 65536],
    ['JWT_SECRET', 'short'],
    ['JWT_SECRET', 'your-super-secret-jwt-key-change-in-production'],
    ['CORS_ORIGIN', '*'],
    ['CORS_ORIGIN', 'https://example.com/path'],
    ['CORS_ORIGIN', 'https://user:pass@example.com'],
    ['BODY_LIMIT_BYTES', 99999999],
    ['THROTTLE_LIMIT', 0],
  ])('rejects invalid %s', (key, value) => {
    expect(
      appConfigSchema.validate({ ...base, [key]: value }).error,
    ).toBeDefined();
  });
  it('defaults production documentation off and refuses enabling it', () => {
    expect(
      appConfigSchema.validate({ ...base, NODE_ENV: 'production' }).value
        .SWAGGER_ENABLED,
    ).toBe('false');
    expect(
      appConfigSchema.validate({
        ...base,
        NODE_ENV: 'production',
        SWAGGER_ENABLED: 'true',
      }).error,
    ).toBeDefined();
  });
  it('accepts explicit browser origins and normalizes surrounding whitespace', () => {
    const result = appConfigSchema.validate({
      ...base,
      CORS_ORIGIN: 'https://one.example, https://two.example',
    });
    expect(result.error).toBeUndefined();
    expect(result.value.CORS_ORIGIN).toBe(
      'https://one.example,https://two.example',
    );
  });
});
