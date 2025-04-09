import {
  FindManyOptions,
  FindOptionsOrder,
  FindOptionsSelect,
  FindOptionsWhere,
  ILike,
  Between,
} from 'typeorm';
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { plainToInstance, Type } from 'class-transformer';

import { PaginationMeta } from 'src/lib/transformers/response.transformer';

/**
 * Available sort directions
 */
export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

/**
 * Sort configuration for query results
 */
export class SortOption<T> {
  @IsString()
  field: keyof T;

  @IsEnum(SortOrder)
  @IsOptional()
  order?: SortOrder = SortOrder.DESC;
}

/**
 * Date range filter for query
 */
export class DateRangeFilter {
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  from?: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  to?: Date;
}

/**
 * Base DTO for handling query parameters in API endpoints
 * Provides pagination, sorting, searching, and filtering capabilities
 */
export class QueryOptionsDto<T> {
  /**
   * Search query string
   */
  @IsOptional()
  @IsString()
  q?: string;

  /**
   * When true, returns all results without pagination
   */
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  all?: boolean = false;

  /**
   * Current page number (1-based)
   */
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  /**
   * Number of results per page
   */
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100) // Prevent excessive page sizes
  @Type(() => Number)
  limit?: number = 10;

  /**
   * Field to sort by (defaults to createdAt)
   */
  @IsOptional()
  @IsString()
  sortBy?: keyof T = 'createdAt' as keyof T;

  /**
   * Sort direction
   */
  @IsOptional()
  @IsEnum(SortOrder)
  order?: SortOrder = SortOrder.DESC;

  /**
   * Advanced sorting with multiple fields
   */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SortOption)
  sorts?: SortOption<T>[];

  /**
   * Date range filter (applicable to createdAt by default)
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => DateRangeFilter)
  dateRange?: DateRangeFilter;

  /**
   * Fields to include in response
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fields?: (keyof T)[];

  /**
   * Initialize a QueryOptionsDto from partial parameters
   */
  static getInstance<T>(
    params: Partial<QueryOptionsDto<T>>,
  ): QueryOptionsDto<T> {
    return plainToInstance(QueryOptionsDto, params, {
      excludeExtraneousValues: false,
    });
  }

  /**
   * Build TypeORM find options from the query parameters
   */
  getOptions(
    searchFields?: Array<keyof T & string>,
    whereOptions?: FindOptionsWhere<T>,
    relations: string[] = [],
  ): FindManyOptions<T> {
    let baseQuery: FindManyOptions<T> = {};
    let where: FindOptionsWhere<T> | FindOptionsWhere<T>[] = {};

    // Apply search filter if searchFields are provided
    if (searchFields?.length && this.q) {
      const searchOptions = this.getSearchOptions(searchFields);
      where = whereOptions
        ? ([
            ...searchOptions.map((condition) => ({
              ...whereOptions,
              ...condition,
            })),
          ] as FindOptionsWhere<T>[])
        : (searchOptions as FindOptionsWhere<T>[]);
    } else if (whereOptions) {
      where = whereOptions;
    }

    // Apply date range filter if provided
    if (this.dateRange) {
      const dateFilter = this.getDateRangeFilter();
      where = Array.isArray(where)
        ? where.map((w) => ({ ...w, ...dateFilter }))
        : { ...where, ...dateFilter };
    }

    // Set up sort order
    let order: FindOptionsOrder<T>;
    if (this.sorts?.length) {
      order = this.sorts.reduce((acc, sort) => {
        acc[sort.field as string] = sort.order;
        return acc;
      }, {} as FindOptionsOrder<T>);
    } else {
      order = {
        [this.sortBy]: this.order,
      } as FindOptionsOrder<T>;
    }

    baseQuery = {
      where,
      order,
      relations,
    };

    // Apply field selection if specified
    if (this.fields?.length) {
      baseQuery.select = this.fields.reduce((acc, field) => {
        acc[field as string] = true;
        return acc;
      }, {} as FindOptionsSelect<T>);
    }

    // Skip pagination if all results are requested
    if (this.all) {
      return baseQuery;
    }

    // Apply pagination
    return {
      ...baseQuery,
      take: this.limit,
      skip: (this.page - 1) * this.limit,
    };
  }

  /**
   * Format the response with pagination metadata conforming to PaginationMeta interface
   *
   * @param data Array of items
   * @param totalItems Total count of items matching the query
   * @returns Object with data and pagination metadata
   */
  getResponse<Entity>(
    data: Entity[],
    totalItems: number,
  ): { data: Entity[]; pagination: PaginationMeta } {
    if (this.all) return { data, pagination: null };

    const totalPages = Math.ceil(totalItems / this.limit);
    return {
      data,
      pagination: {
        page: this.page,
        limit: this.limit,
        totalItems,
        totalPages,
        hasNextPage: this.page < totalPages,
        hasPreviousPage: this.page > 1,
      },
    };
  }

  /**
   * Creates a pagination metadata object aligned with ResponseTransformer
   *
   * @param totalItems Total count of items matching the query
   * @returns PaginationMeta object
   */
  getPaginationMeta(totalItems: number): PaginationMeta {
    if (this.all) return null;

    const totalPages = Math.ceil(totalItems / this.limit);
    return {
      page: this.page,
      limit: this.limit,
      totalItems,
      totalPages,
      hasNextPage: this.page < totalPages,
      hasPreviousPage: this.page > 1,
    };
  }

  /**
   * Generate search conditions for TypeORM
   */
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

  /**
   * Generate date range filter for TypeORM
   */
  protected getDateRangeFilter(): FindOptionsWhere<T> {
    const { from, to } = this.dateRange || {};

    if (!from && !to) return {} as FindOptionsWhere<T>;

    if (from && to) {
      return {
        createdAt: Between(from, to),
      } as unknown as FindOptionsWhere<T>;
    }

    if (from) {
      return {
        createdAt: Between(from, new Date()),
      } as unknown as FindOptionsWhere<T>;
    }

    // Only to is defined
    const startDate = new Date(0); // January 1, 1970
    return {
      createdAt: Between(startDate, to!),
    } as unknown as FindOptionsWhere<T>;
  }
}
