import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfigModule } from '../../config/app-config.module';
import { AppConfigService } from '../../config/app-config.service';
import { AuthSession } from './entities/auth-session.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { AuthSessionsService } from './services/auth-sessions.service';

@Module({
  imports: [
    AppConfigModule,
    TypeOrmModule.forFeature([AuthSession, RefreshToken]),
    JwtModule.registerAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        secret: config.auth.secret,
      }),
    }),
  ],
  providers: [AuthSessionsService],
  exports: [AuthSessionsService],
})
export class AuthSessionsModule {}
