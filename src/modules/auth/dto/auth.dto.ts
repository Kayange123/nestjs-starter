import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CreateUserDto } from '../../users/dto/user.dto';

export class RegisterDto extends CreateUserDto {}

export class TokenResponseDto {
  @ApiProperty()
  accessToken: string;
  @ApiProperty()
  refreshToken: string;
  @ApiProperty()
  expiresIn: number;
}

export class RefreshDto {
  @ApiProperty({
    description: 'Opaque refresh credential returned by login or refresh',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  refreshToken: string;
}

/** HTTP response envelope added by ResponseInterceptor. */
export class TokenEnvelopeDto {
  @ApiProperty({ type: TokenResponseDto })
  data: TokenResponseDto;
}
