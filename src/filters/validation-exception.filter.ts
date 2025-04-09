import {
  Catch,
  ArgumentsHost,
  ExceptionFilter,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { ValidationError } from 'class-validator';

/**
 * Validation exception filter that handles errors from class-validator
 * and provides structured error responses for validation failures.
 */
@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ValidationExceptionFilter.name);

  catch(exception: BadRequestException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<any>();
    const status = exception.getStatus();

    const errorResponse = exception.getResponse() as any;

    // Check if this is a validation error (from class-validator)
    if (errorResponse?.message && Array.isArray(errorResponse.message)) {
      const validationErrors = this.formatValidationErrors(
        errorResponse.message,
      );

      // Log all validation errors
      this.logger.warn(`Validation failed: ${request.method} ${request.url}`, {
        errors: validationErrors,
        body: request.body,
        user: request?.user?.id || 'anonymous',
      });

      response.status(status).json({
        statusCode: status,
        error: 'Validation Failed',
        message: 'The provided data is invalid',
        errors: validationErrors,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    } else {
      // Handle as a regular BadRequestException if not validation errors
      response.status(status).json({
        statusCode: status,
        message: errorResponse.message || 'Bad Request',
        error: 'Bad Request',
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  }

  /**
   * Format validation errors into a more readable structure
   * @param errors Array of validation errors or error messages
   */
  private formatValidationErrors(errors: any[]): Record<string, string[]> {
    const formattedErrors: Record<string, string[]> = {};

    // Handle class-validator ValidationError objects
    if (errors.length > 0 && typeof errors[0] === 'object') {
      errors.forEach((error: ValidationError) => {
        if (error.property && error.constraints) {
          formattedErrors[error.property] = Object.values(error.constraints);

          // Handle nested validation errors
          if (error.children && error.children.length > 0) {
            const childErrors = this.formatValidationErrors(error.children);
            Object.keys(childErrors).forEach((key) => {
              formattedErrors[`${error.property}.${key}`] = childErrors[key];
            });
          }
        }
      });
    }
    // Handle simple string error messages
    else if (errors.length > 0 && typeof errors[0] === 'string') {
      formattedErrors.general = errors as string[];
    }

    return formattedErrors;
  }
}
