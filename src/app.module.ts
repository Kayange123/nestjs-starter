import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';

import { AppService } from 'src/app.service';
import { AppController } from 'src/app.controller';
import { AuthModule } from 'src/modules/auth/auth.module';
import { CsrfModule } from 'src/security/csrf/csrf.module';
import { LoggerModule } from 'src/lib/logger/logger.module';
import { AppCacheModule } from 'src/lib/cache/cache.module';
import { UsersModule } from 'src/modules/users/users.module';
import { DatabaseModule } from 'src/database/database.module';
import { AppConfigModule } from 'src/config/app-config.module';
import { HealthModule } from 'src/modules/health/health.module';
import { TransformerModule } from 'src/lib/transformers/transformer.module';
import { SecurityHeadersModule } from 'src/security/headers/security-headers.module';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    LoggerModule,
    AppCacheModule,
    TransformerModule,
    CsrfModule,
    SecurityHeadersModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    UsersModule,
    AuthModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
