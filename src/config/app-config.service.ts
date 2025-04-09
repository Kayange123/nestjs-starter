import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService) {}

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

  get db(): {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    sync: boolean;
    logging: boolean;
  } {
    return {
      host: this.config.get<string>('DB_HOST'),
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
      ttl: this.config.get<number>('CACHE_TTL') || 300,
    };
  }
}
