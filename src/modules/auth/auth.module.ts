import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { UsersModule } from '../users/users.module';
import { AppConfigModule } from '../../config/app-config.module';
import { AppConfigService } from '../../config/app-config.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { AuthSessionsModule } from './auth-sessions.module';

@Module({
  imports: [
    PassportModule,
    AppConfigModule,
    AuthSessionsModule,
    UsersModule,
    ThrottlerModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => [
        { ttl: config.auth.throttleTtlMs, limit: config.auth.throttleLimit },
      ],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
