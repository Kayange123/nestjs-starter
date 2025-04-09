import { JwtService } from '@nestjs/jwt';
import { Injectable, UnauthorizedException } from '@nestjs/common';

import { LoginDto } from 'src/modules/auth/dto/login.dto';
import { UsersService } from 'src/modules/users/services/users.service';
import { RegisterDto, TokenResponseDto } from 'src/modules/auth/dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await user.verifyPassword(password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  async login(dto: LoginDto): Promise<TokenResponseDto> {
    const user = await this.validateUser(dto.email, dto.password);
    return this.generateTokens(user);
  }

  async register(dto: RegisterDto): Promise<TokenResponseDto> {
    const user = await this.usersService.create(dto);
    return this.generateTokens(user);
  }

  private generateTokens(user: any): TokenResponseDto {
    const payload = { email: user.email, sub: user.id };
    const expiresIn = 3600; // 1 hour

    return {
      accessToken: this.jwtService.sign(payload, { expiresIn }),
      refreshToken: this.jwtService.sign(payload, {
        expiresIn: '7d',
      }),
      expiresIn,
    };
  }
}
