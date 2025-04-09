import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Body, Controller, Post, UseGuards } from '@nestjs/common';

import { LoginDto } from 'src/modules/auth/dto/login.dto';
import { AuthService } from 'src/modules/auth/services/auth.service';
import { RegisterDto, TokenResponseDto } from 'src/modules/auth/dto/auth.dto';

@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async login(@Body() loginDto: LoginDto): Promise<TokenResponseDto> {
    return this.authService.login(loginDto);
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto): Promise<TokenResponseDto> {
    return this.authService.register(registerDto);
  }
}
