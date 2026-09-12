import { AuthSessionsService } from './auth-sessions.service';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';

import { LoginDto } from 'src/modules/auth/dto/login.dto';
import { UsersService } from 'src/modules/users/services/users.service';
import { RegisterDto, TokenResponseDto } from 'src/modules/auth/dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private readonly usersService: UsersService,
    private readonly sessions: AuthSessionsService,
  ) {}

  async validateUser(userName: string, password: string) {
    const user = await this.usersService.findByEmailOrPhoneNumber(userName);
    if (!user) {
      this.logger.warn({ event: 'auth.login.failed' });
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await user.verifyPassword(password);
    if (!isPasswordValid) {
      this.logger.warn({ event: 'auth.login.failed' });
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  async login(dto: LoginDto): Promise<TokenResponseDto> {
    const user = await this.validateUser(dto.userName, dto.password);
    return this.sessions.create(user.id, user.password);
  }

  async register(dto: RegisterDto): Promise<TokenResponseDto> {
    const user = await this.usersService.create(dto);
    return this.sessions.create(user.id, user.password);
  }

  refresh(refreshToken: string): Promise<TokenResponseDto> {
    return this.sessions.refresh(refreshToken);
  }
}
