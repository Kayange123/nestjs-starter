import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppConfigService } from './config/app-config.service';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AppService } from 'src/app.service';
import { AppController } from 'src/app.controller';
import { AuthModule } from 'src/modules/auth/auth.module';
import { LoggerModule } from 'src/lib/logger/logger.module';
import { AppCacheModule } from 'src/lib/cache/cache.module';
import { UsersModule } from 'src/modules/users/users.module';
import { DatabaseModule } from 'src/database/database.module';
import { AppConfigModule } from 'src/config/app-config.module';
import { HealthModule } from 'src/modules/health/health.module';
import { TransformerModule } from 'src/lib/transformers/transformer.module';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    LoggerModule,
    AppCacheModule,
    TransformerModule,
    ThrottlerModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => [
        {
          name: 'global',
          ttl: config.operations.throttleTtlMs,
          limit: config.operations.throttleLimit,
        },
      ],
    }),
    UsersModule,
    AuthModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
