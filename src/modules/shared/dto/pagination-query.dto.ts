import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export const MAX_PAGE_SIZE = 100;
export const MAX_PAGE = Math.floor(Number.MAX_SAFE_INTEGER / MAX_PAGE_SIZE);

// Reject arrays, booleans, whitespace, fractions and alternate number syntax.
function parseInteger(value: unknown): number {
  if (typeof value === 'number') return value;
  return typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : NaN;
}

export class PaginationQueryDto {
  @ApiPropertyOptional({
    type: 'integer',
    minimum: 1,
    maximum: MAX_PAGE,
    default: 1,
  })
  @Transform(({ value }) => parseInteger(value))
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE)
  page = 1;

  @ApiPropertyOptional({
    type: 'integer',
    minimum: 1,
    maximum: MAX_PAGE_SIZE,
    default: 10,
  })
  @Transform(({ value }) => parseInteger(value))
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  limit = 10;
}
