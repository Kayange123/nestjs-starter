import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsISO8601,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { PaginationQueryDto } from '../../shared/dto/pagination-query.dto';

export enum UserSortField {
  ID = 'id',
  FIRST_NAME = 'firstName',
  LAST_NAME = 'lastName',
  EMAIL = 'email',
  CREATED_AT = 'createdAt',
}

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

export class UserQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description:
      'Literal case-insensitive substring in firstName, lastName or email',
    maxLength: 100,
  })
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({
    enum: UserSortField,
    default: UserSortField.CREATED_AT,
  })
  @IsEnum(UserSortField)
  sortBy: UserSortField = UserSortField.CREATED_AT;

  @ApiPropertyOptional({ enum: SortOrder, default: SortOrder.DESC })
  @IsEnum(SortOrder)
  order: SortOrder = SortOrder.DESC;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    description: 'Inclusive lower creation timestamp; timezone required',
    example: '2026-01-01T00:00:00Z',
  })
  @ValidateIf((_, value) => value !== undefined)
  @IsISO8601({ strict: true, strictSeparator: true })
  @Matches(/T.*(?:Z|[+-]\d{2}:\d{2})$/)
  createdFrom?: string;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    description: 'Inclusive upper creation timestamp; timezone required',
    example: '2026-12-31T23:59:59Z',
  })
  @ValidateIf((_, value) => value !== undefined)
  @IsISO8601({ strict: true, strictSeparator: true })
  @Matches(/T.*(?:Z|[+-]\d{2}:\d{2})$/)
  createdTo?: string;
}
