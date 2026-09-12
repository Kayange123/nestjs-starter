import { DatabaseSettings } from './database-config';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService) {}

  get auth() {
    return {
      secret: this.config.get<string>('JWT_SECRET'),
      accessTtlSeconds: this.config.get<number>('JWT_ACCESS_TTL_SECONDS'),
      sessionTtlSeconds: this.config.get<number>('AUTH_SESSION_TTL_SECONDS'),
      issuer: this.config.get<string>('JWT_ISSUER'),
      audience: this.config.get<string>('JWT_AUDIENCE'),
      throttleTtlMs: this.config.get<number>('AUTH_THROTTLE_TTL_MS'),
      throttleLimit: this.config.get<number>('AUTH_THROTTLE_LIMIT'),
    };
  }

  get operations() {
    return {
      corsOrigins: (this.config.get<string>('CORS_ORIGIN') || '')
        .split(',')
        .filter(Boolean),
      bodyLimitBytes: this.config.get<number>('BODY_LIMIT_BYTES'),
      swaggerEnabled: this.config.get<string>('SWAGGER_ENABLED') === 'true',
      healthTimeoutMs: this.config.get<number>('HEALTH_TIMEOUT_MS'),
      throttleTtlMs: this.config.get<number>('THROTTLE_TTL'),
      throttleLimit: this.config.get<number>('THROTTLE_LIMIT'),
      logLevel: this.config.get<string>('LOG_LEVEL'),
    };
  }

  get appName(): string {
    return this.config.get<string>('APP_NAME');
  }

  get appDescription(): string {
    return this.config.get<string>('APP_DESCRIPTION');
  }

  get nodeEnv(): string {
    return this.config.get<string>('NODE_ENV');
  }

  get port(): number {
    return this.config.get<number>('PORT');
  }

  get db(): DatabaseSettings {
    return {
      host: this.config.get<string>('DB_HOST'),
      schema: this.config.get<string>('DB_SCHEMA'),
      port: this.config.get<number>('DB_PORT'),
      name: this.config.get<string>('DB_NAME'),
      user: this.config.get<string>('DB_USER'),
      password: this.config.get<string>('DB_PASSWORD'),
      sync: this.config.get<string>('DB_SYNC') === 'true',
      logging: this.config.get<string>('DB_LOGGING') === 'true',
    };
  }

  get cache(): {
    ttl: number;
  } {
    return {
      ttl: (this.config.get<number>('CACHE_TTL') ?? 300) * 1000,
    };
  }
}
