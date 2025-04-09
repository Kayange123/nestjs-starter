import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError, EntityNotFoundError, TypeORMError } from 'typeorm';

/**
 * Database exception filter that handles TypeORM and other database-specific errors
 */
@Catch(TypeORMError)
export class DatabaseExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DatabaseExceptionFilter.name);

  catch(exception: TypeORMError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Database error';
    let detail = null;

    // Handle specific TypeORM errors
    if (exception instanceof QueryFailedError) {
      const error = exception as any;

      // PostgreSQL error codes
      if (error.code === '23505') {
        // Unique violation
        status = HttpStatus.CONFLICT;
        message = 'Resource already exists';
        detail = this.#extractConstraintDetail(error.detail);
      } else if (error.code === '23503') {
        // Foreign key violation
        status = HttpStatus.BAD_REQUEST;
        message = 'Related resource not found';
        detail = this.#extractConstraintDetail(error.detail);
      } else if (error.code?.startsWith('22')) {
        // Data exception
        status = HttpStatus.BAD_REQUEST;
        message = 'Invalid data format';
      } else if (error.code?.startsWith('42')) {
        // Syntax error or access rule violation
        status = HttpStatus.BAD_REQUEST;
        message = 'Database query error';
      }
    } else if (exception instanceof EntityNotFoundError) {
      status = HttpStatus.NOT_FOUND;
      message = 'Resource not found';
    }

    // Log the error
    this.logger.error(`Database Error: ${exception.message}`, exception.stack, {
      path: request.url,
      method: request.method,
    });

    // Return formatted response
    response.status(status).json({
      statusCode: status,
      message,
      ...(detail && { detail }),
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  /**
   * Extract useful information from PostgreSQL constraint error messages
   */
  #extractConstraintDetail(detail: string): string | null {
    if (!detail) return null;

    // Extract key information from constraint violation messages
    const keyMatch = detail.match(/\(([^)]+)\)=\(([^)]+)\)/);
    if (keyMatch && keyMatch.length >= 3) {
      const field = keyMatch[1];
      const value = keyMatch[2];
      return `Duplicate value '${value}' for field '${field}'`;
    }

    // Extract foreign key information
    const fkMatch = detail.match(/Key \(([^)]+)\)=\(([^)]+)\) is not present/);
    if (fkMatch && fkMatch.length >= 3) {
      const field = fkMatch[1];
      const value = fkMatch[2];
      return `Referenced value '${value}' for field '${field}' does not exist`;
    }

    return null;
  }
}
