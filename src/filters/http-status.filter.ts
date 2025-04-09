import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * HTTP status exception filter that handles specific HTTP exceptions
 * and provides more detailed error messages.
 */
@Catch(HttpException)
export class HttpStatusFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpStatusFilter.name);

  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    // Get the original response from the exception
    const errorResponse = exception.getResponse();

    // Build custom response
    const errorBody = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      ...(typeof errorResponse === 'object'
        ? errorResponse
        : { message: errorResponse }),
    };

    // Log the error with appropriate severity based on status code
    const errorMessage = `HTTP Exception: ${status} - ${request.method} ${request.url}`;
    if (status >= 500) {
      this.logger.error(errorMessage, exception.stack);
    } else if (status >= 400) {
      this.logger.warn(errorMessage, {
        body: request.body,
        query: request.query,
        params: request.params,
      });
    } else {
      this.logger.log(errorMessage);
    }

    response.status(status).json(errorBody);
  }
}
