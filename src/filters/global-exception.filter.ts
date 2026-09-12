import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
  ValidationError,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { Request, Response } from 'express';

interface ErrorResponse {
  statusCode: number;
  message: string;
  error?: string;
  timestamp: string;
  path?: string;
  errors?: Record<string, any>;
}

/**
 * Global exception filter that catches all unhandled exceptions
 * and formats them into a consistent response structure.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(private readonly nodeEnv: string) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, message, error, errors } = this.#formatException(exception);

    // Log exception with context for debugging
    this.#logException(exception, {
      route: request.route?.path ?? 'unmatched',
      requestId: response.getHeader('x-request-id'),
      method: request.method,
      statusCode: status,
    });

    response.status(status).json(
      this.#buildResponseBody({
        status,
        message,
        error,
        errors,
        path: request.path,
      }),
    );
  }

  /**
   * Formats the exception into status, message and error details
   * @param exception The caught exception
   * @returns Formatted exception data
   */
  #formatException(exception: unknown): {
    status: number;
    message: string;
    error: any;
    errors?: Record<string, any>;
  } {
    if (exception instanceof HttpException) {
      return this.#handleHttpException(exception);
    }

    if (exception instanceof QueryFailedError) {
      return this.#handleDatabaseError(exception);
    }

    return this.#handleGenericError(exception);
  }

  /**
   * Handle HTTP exceptions specifically
   * @param exception The HTTP exception
   * @returns Formatted exception data
   */
  #handleHttpException(exception: HttpException) {
    const status = exception.getStatus();
    let message = exception.message;
    let error = null;
    let errors = null;

    const responseBody = exception.getResponse();

    if (typeof responseBody === 'object' && responseBody !== null) {
      const responseObj = responseBody as any;
      message = responseObj.message || exception.message;

      if (this.#isValidationError(responseObj.message)) {
        message = 'Validation failed';
        errors = this.#formatValidationErrors(responseObj.message);
      }
    }

    if (status === HttpStatus.BAD_REQUEST) {
      error = 'Bad Request';
    }

    return { status, message, error, errors };
  }

  /**
   * Check if the message contains validation errors
   */
  #isValidationError(message: any): boolean {
    return (
      Array.isArray(message) &&
      message.length > 0 &&
      message[0] instanceof Object
    );
  }

  /**
   * Handle database specific errors
   * @param exception The database exception
   * @returns Formatted exception data
   */
  #handleDatabaseError(_exception: QueryFailedError) {
    const status = HttpStatus.BAD_REQUEST;
    const message = 'Database query failed';
    const error = 'A database error occurred';

    return { status, message, error, errors: null };
  }

  /**
   * Handle generic errors
   * @param exception Any error
   * @returns Formatted exception data
   */
  #handleGenericError(_exception: unknown) {
    const status = HttpStatus.INTERNAL_SERVER_ERROR;
    const message = 'An unexpected error occurred';
    const error = null;

    return { status, message, error, errors: null };
  }

  /**
   * Formats validation errors into a more readable structure
   * @param validationErrors Array of validation errors
   * @returns Formatted validation errors
   */
  #formatValidationErrors(
    validationErrors: ValidationError[],
  ): Record<string, string[]> {
    const errors: Record<string, string[]> = {};

    validationErrors.forEach((error) => {
      const property = error.property;
      const constraints = error.constraints
        ? Object.values(error.constraints)
        : ['Invalid value'];

      errors[property] = constraints;

      // Handle nested validation errors
      if (error?.children?.length) {
        const nestedErrors = this.#formatValidationErrors(error.children);
        Object.keys(nestedErrors).forEach((key) => {
          errors[`${property}.${key}`] = nestedErrors[key];
        });
      }
    });

    return errors;
  }

  /**
   * Logs exception with context information
   * @param exception The exception to log
   * @param context Additional context information
   */
  #logException(exception: unknown, context: Record<string, any>): void {
    this.logger.warn({
      ...context,
      errorType: exception instanceof Error ? exception.name : 'UnknownError',
    });
  }

  /**
   * Builds the response body based on environment and error details
   * @param options Response options
   * @returns Response body object
   */
  #buildResponseBody({
    status,
    message,
    error,
    errors,
    path,
  }: {
    status: number;
    message: string;
    error?: any;
    errors?: Record<string, any>;
    path?: string;
  }): ErrorResponse {
    const responseBody: ErrorResponse = {
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
    };

    if (path) {
      responseBody.path = path;
    }

    // Add detailed error information in development mode
    if (this.nodeEnv === 'development') {
      if (error) {
        responseBody.error = error;
      }

      if (errors) {
        responseBody.errors = errors;
      }
    } else if (errors) {
      // In production, only add validation errors
      responseBody.errors = errors;
    }

    return responseBody;
  }
}
