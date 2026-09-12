import { BadRequestException } from '@nestjs/common';
import {
  Between,
  FindManyOptions,
  FindOptionsWhere,
  ILike,
  LessThanOrEqual,
  MoreThanOrEqual,
} from 'typeorm';
import { User } from '../entities/user.entity';
import { UserQueryDto, UserSortField } from '../dto/user-query.dto';

const USER_SEARCH_FIELDS = ['firstName', 'lastName', 'email'] as const;

/** Maps the validated user HTTP contract to parameterized TypeORM options. */
export function mapUserQuery(query: UserQueryDto): FindManyOptions<User> {
  const from =
    query.createdFrom === undefined ? undefined : new Date(query.createdFrom);
  const to =
    query.createdTo === undefined ? undefined : new Date(query.createdTo);
  if (
    (from && !Number.isFinite(from.getTime())) ||
    (to && !Number.isFinite(to.getTime())) ||
    (from && to && from > to)
  ) {
    throw new BadRequestException(
      'createdFrom must be a valid timestamp no later than createdTo',
    );
  }
  const filters: FindOptionsWhere<User> = {};
  if (from && to) filters.createdAt = Between(from, to);
  else if (from) filters.createdAt = MoreThanOrEqual(from);
  else if (to) filters.createdAt = LessThanOrEqual(to);

  // Escape LIKE metacharacters: q is literal text, not a wildcard expression.
  const search = query.q?.replace(/[\\%_]/g, '\\$&');
  const where = search
    ? USER_SEARCH_FIELDS.map((field) => ({
        ...filters,
        [field]: ILike(`%${search}%`),
      }))
    : filters;
  return {
    where,
    order:
      query.sortBy === UserSortField.ID
        ? { id: query.order }
        : { [query.sortBy]: query.order, id: query.order },
    take: query.limit,
    skip: (query.page - 1) * query.limit,
    relations: { roles: true },
    // API output is still mapped to UserResponseDto; clients cannot select columns.
  };
}
