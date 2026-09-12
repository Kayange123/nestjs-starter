import { ApiProperty } from '@nestjs/swagger';
import {
  PaginationMeta,
  PaginatedResult,
} from '../../shared/dto/paginated-result';
import { UserResponseDto } from './user.dto';

export class PaginatedUsersResponseDto implements PaginatedResult<UserResponseDto> {
  @ApiProperty({ type: [UserResponseDto] })
  data: UserResponseDto[];

  @ApiProperty({ type: PaginationMeta })
  pagination: PaginationMeta;
}
