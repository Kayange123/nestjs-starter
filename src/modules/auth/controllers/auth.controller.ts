import { Request } from 'express';
import { ApiBearerAuth, ApiTags, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AuthenticatedUser } from '../strategies/jwt.strategy';
import { AuthSessionsService } from '../services/auth-sessions.service';
import { ThrottlerGuard } from '@nestjs/throttler';
import {
  Body,
  Controller,
  Post,
  UseGuards,
  HttpCode,
  Req,
} from '@nestjs/common';

import { LoginDto } from 'src/modules/auth/dto/login.dto';
import { AuthService } from 'src/modules/auth/services/auth.service';
import {
  RegisterDto,
  TokenResponseDto,
  TokenEnvelopeDto,
  RefreshDto,
} from 'src/modules/auth/dto/auth.dto';

@ApiTags('auth')
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessions: AuthSessionsService,
  ) {}

  @Post('login')
  @ApiResponse({ status: 201, type: TokenEnvelopeDto })
  async login(@Body() loginDto: LoginDto): Promise<TokenResponseDto> {
    return this.authService.login(loginDto);
  }

  @Post('register')
  @ApiResponse({ status: 201, type: TokenEnvelopeDto })
  async register(@Body() registerDto: RegisterDto): Promise<TokenResponseDto> {
    return this.authService.register(registerDto);
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiResponse({ status: 200, type: TokenEnvelopeDto })
  refresh(@Body() dto: RefreshDto): Promise<TokenResponseDto> {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({ status: 204, description: 'Current session revoked' })
  logout(@Req() request: Request & { user: AuthenticatedUser }): Promise<void> {
    return this.sessions.logout(request.user.sessionId, request.user.id);
  }
}
