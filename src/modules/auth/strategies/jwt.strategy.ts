import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { isUUID } from 'class-validator';
import { AppConfigService } from '../../../config/app-config.service';
import { UsersService } from '../../users/services/users.service';
import { User } from '../../users/entities/user.entity';
import {
  AccessTokenPayload,
  AuthSessionsService,
} from '../services/auth-sessions.service';

export type AuthenticatedUser = User & { sessionId: string };

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: AppConfigService,
    private readonly usersService: UsersService,
    private readonly sessions: AuthSessionsService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.auth.secret,
      algorithms: ['HS256'],
      issuer: config.auth.issuer,
      audience: config.auth.audience,
    });
  }
  async validate(payload: AccessTokenPayload): Promise<AuthenticatedUser> {
    if (
      !payload ||
      payload.type !== 'access' ||
      !Number.isSafeInteger(payload.exp) ||
      !Number.isSafeInteger(payload.sub) ||
      payload.sub < 1 ||
      typeof payload.sid !== 'string' ||
      !isUUID(payload.sid, '4') ||
      !(await this.sessions.isActive(payload))
    )
      throw new UnauthorizedException('Invalid access token');
    try {
      const user = await this.usersService.findById(payload.sub);
      return Object.assign(user, { sessionId: payload.sid });
    } catch (error) {
      if (error instanceof NotFoundException)
        throw new UnauthorizedException('Invalid access token');
      throw error;
    }
  }
}
