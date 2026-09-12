import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfigModule } from '../config/app-config.module';
import { AppConfigService } from '../config/app-config.service';
import { databaseOptions } from './database-options';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => {
        const options = databaseOptions(config.db);
        return {
          ...options,
          retryAttempts: 3,
          retryDelay: 1000,
          extra: {
            ...options.extra,
            connectionTimeoutMillis: 5000,
            query_timeout: 10000,
            statement_timeout: 10000,
          },
        };
      },
    }),
  ],
})
export class DatabaseModule {}
