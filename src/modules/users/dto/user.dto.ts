import { User } from '../entities/user.entity';
import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  ValidateIf,
  IsString,
  IsStrongPassword,
  MaxLength,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(15)
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(15)
  lastName: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(30)
  email: string;

  @ApiProperty({ example: 'Strong:Password123' })
  @IsString()
  @IsNotEmpty()
  @IsStrongPassword({ minLength: 8 })
  @MaxLength(128)
  password: string;
}

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['password'] as const),
  { skipNullProperties: false },
) {
  @ApiProperty({ example: 'New:Password123', required: false })
  @IsString()
  @ValidateIf((_, value) => value !== undefined)
  @IsStrongPassword({ minLength: 8 })
  @MaxLength(128)
  password?: string;
}

export class UserResponseDto {
  constructor(user: User) {
    this.id = user.id;
    this.firstName = user.firstName;
    this.lastName = user.lastName;
    this.email = user.email;
    this.createdAt = user.createdAt;
    this.updatedAt = user.updatedAt;
    this.roles = (user.roles ?? []).map((role) => role.name);
  }

  @ApiProperty()
  id: number;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  roles: string[];
}

export class UserEnvelopeDto {
  @ApiProperty({ type: UserResponseDto })
  data: UserResponseDto;
}
