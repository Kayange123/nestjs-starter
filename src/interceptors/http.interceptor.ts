import {
  CallHandler,
  ExecutionContext,
  HttpStatus,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { map, Observable, catchError, throwError } from 'rxjs';

/**
 * Interceptor that standardizes HTTP request/response handling
 * - Tracks request timing for performance monitoring
 * - Adds unique request IDs for tracing
 * - Normalizes response format
 * - Provides consistent error handling and logging
 */
@Injectable()
export class HttpInterceptor implements NestInterceptor {
  private readonly logger = new Logger(HttpInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = performance.now();

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Extract and prepare request metadata
    const { method, endpoint, requestId, userAgent } =
      this.#prepareRequestMetadata(request);
    response.setHeader('X-Request-ID', requestId);

    // Log incoming request
    this.#logRequest(method, endpoint, userAgent, requestId, request.body);

    // Process request and handle response
    return next.handle().pipe(
      map((data: any) =>
        this.#handleSuccess(response, data, startTime, requestId),
      ),
      catchError((error: any) =>
        this.#handleError(error, startTime, requestId),
      ),
    );
  }

  /**
   * Extracts and prepares metadata from the request
   */
  #prepareRequestMetadata(request: Request): {
    method: string;
    endpoint: string;
    requestId: string;
    userAgent: string;
  } {
    const method = request.method;
    const endpoint = request.originalUrl.split('/').slice(3).join('/');
    const userAgent = this.#assessUserAgentDevice(
      request.headers['user-agent'] || '',
    );
    const requestId = this.#generateRequestId();

    return { method, endpoint, requestId, userAgent };
  }

  /**
   * Handles successful responses
   */
  #handleSuccess(
    response: Response,
    data: any,
    startTime: number,
    requestId: string,
  ): Record<string, any> {
    const statusCode = response.statusCode;
    const elapsedTime = performance.now() - startTime;

    const hasPagination = data?.pagination != null;
    const responseObject = this.#constructResponse(
      statusCode,
      data,
      hasPagination,
    );

    response.header('Content-Type', 'application/json');
    this.#logResponse(statusCode, elapsedTime, requestId);

    return responseObject;
  }

  /**
   * Handles errors in the request processing pipeline
   */
  #handleError(error: any, startTime: number, requestId: string) {
    const elapsedTime = performance.now() - startTime;

    this.logger.error(
      `Error (${requestId}): ${error.message}. Time taken: ${elapsedTime.toFixed(2)} ms`,
      error.stack,
    );

    return throwError(() => error);
  }

  /**
   * Determines the client device type from user agent
   */
  #assessUserAgentDevice(userAgent: string): string {
    if (userAgent.includes('okhttp') || userAgent.includes('dart.io')) {
      return 'Mobile';
    } else if (userAgent.includes('axios')) {
      return 'Web';
    }
    return userAgent;
  }

  /**
   * Generates a unique request identifier
   */
  #generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  }

  /**
   * Logs incoming request details
   */
  #logRequest(
    method: string,
    endpoint: string,
    userAgent: string,
    requestId: string,
    body: any,
  ): void {
    this.logger.log(
      `Req (${requestId}) [${userAgent}]: ${method}: /${endpoint}`,
    );
    if (body && Object.keys(body).length > 0) {
      this.logger.log(
        `Req Body (${requestId}):\n ${JSON.stringify(body, null, 2)}`,
      );
    }
  }

  /**
   * Logs response details
   */
  #logResponse(
    statusCode: number,
    elapsedTime: number,
    requestId: string,
  ): void {
    this.logger.log(
      `Res (${requestId}) [${statusCode}]: Time taken: ${elapsedTime.toFixed(2)} ms`,
    );
  }

  /**
   * Formats response according to standardized structure
   */
  #constructResponse(
    statusCode: number,
    data: any,
    hasPagination: boolean,
  ): Record<string, any> {
    const response: Record<string, any> = {
      status: statusCode,
      message: HttpStatus[statusCode] || 'Unknown Status',
      timestamp: new Date().toISOString(),
    };

    if (data === null || data === undefined) {
      response.data = null;
      return response;
    }

    if (hasPagination) {
      return {
        ...response,
        data: data.data || [],
        pagination: data.pagination,
      };
    }

    response.data = data.data !== undefined ? data.data : data;
    return response;
  }
}
