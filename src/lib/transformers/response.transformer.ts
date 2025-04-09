import { Injectable } from '@nestjs/common';

/**
 * Standard API response interface
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  meta?: Record<string, any>;
  message?: string;
  errors?: any[];
  timestamp: string;
}

/**
 * Pagination metadata interface
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Response transformer service to standardize API responses
 */
@Injectable()
export class ResponseTransformer {
  /**
   * Create a successful response object
   *
   * @param data Response data to include
   * @param meta Optional metadata
   * @param message Optional message
   * @returns Standardized API response
   */
  success<T>(
    data?: T,
    meta?: Record<string, any>,
    message?: string,
  ): ApiResponse<T> {
    return {
      success: true,
      data,
      meta,
      message,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Create a paginated response object
   *
   * @param data Array of items
   * @param paginationMeta Pagination metadata
   * @param message Optional message
   * @returns Standardized paginated API response
   */
  paginated<T>(
    data: T[],
    paginationMeta: PaginationMeta,
    message?: string,
  ): ApiResponse<T[]> {
    return {
      success: true,
      data,
      meta: {
        pagination: paginationMeta,
      },
      message,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Create an error response object
   *
   * @param message Error message
   * @param errors Optional array of detailed errors
   * @returns Standardized error response
   */
  error(message: string, errors?: any[]): ApiResponse<null> {
    return {
      success: false,
      message,
      errors,
      timestamp: new Date().toISOString(),
    };
  }
}
