import { plainToInstance, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import {
  FindManyOptions,
  FindOptionsOrder,
  FindOptionsWhere,
  ILike,
} from 'typeorm';

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

export class QueryOptionsDto<T> {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  all?: boolean = false;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  sortBy?: keyof T = 'createdAt' as keyof T;

  @IsOptional()
  @IsEnum(SortOrder)
  order?: SortOrder = SortOrder.DESC;

  static init<T>(params: Partial<QueryOptionsDto<T>>): QueryOptionsDto<T> {
    return plainToInstance(QueryOptionsDto, params, {
      excludeExtraneousValues: false,
    });
  }

  getOptions(
    searchFields?: Array<keyof T & string>,
    whereOptions?: FindOptionsWhere<T>,
    relations: string[] = [],
  ): FindManyOptions<T> {
    let baseQuery: FindManyOptions<T> = {};

    if (searchFields?.length) {
      const searchOptions = this.getSearchOptions(searchFields);
      baseQuery = {
        where: whereOptions
          ? ([
              ...searchOptions.map((condition) => ({
                ...whereOptions,
                ...condition,
              })),
            ] as FindOptionsWhere<T>[])
          : (searchOptions as FindOptionsWhere<T>[]),
        order: {
          [this.sortBy]: this.order,
        } as FindOptionsOrder<T>,
        relations,
      };
    } else if (whereOptions) {
      baseQuery = {
        where: whereOptions,
        order: {
          [this.sortBy]: this.order,
        } as FindOptionsOrder<T>,
        relations,
      };
    }

    if (this.all) {
      return baseQuery;
    }

    return {
      ...baseQuery,
      take: this.limit,
      skip: (this.page - 1) * this.limit,
    };
  }

  getResponse<Entity>(data: Entity[], totalCount: number) {
    if (this.all) return data;

    const totalPages = Math.ceil(totalCount / this.limit);
    return {
      data,
      pagination: {
        currentPage: this.page,
        totalPages,
        totalCount,
        pageSize: this.limit,
      },
    };
  }

  protected getSearchOptions(
    searchFields: Array<keyof T & string>,
  ): FindOptionsWhere<T>[] {
    if (!this.q) return [{}];

    return searchFields.map(
      (field) =>
        ({
          [field]: ILike(`%${this.q}%`),
        }) as FindOptionsWhere<T>,
    );
  }
}
