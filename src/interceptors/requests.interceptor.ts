import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

/**
 * Interceptor that logs HTTP requests and responses
 * Implements NestJS interceptor pattern to capture request/response details
 */
@Injectable()
export class RequestsInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestsInterceptor.name);
  private readonly dividerLine = '<== [DIVIDER] ==>';

  /**
   * Intercepts HTTP requests to log request/response details
   * @param context - Execution context containing request/response information
   * @param next - Call handler to continue request processing
   * @returns Observable with request handling pipeline
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();
    const { method, url } = request;
    const userAgent = this.#getUserAgentType(request.headers['user-agent']);

    return next.handle().pipe(
      tap((response: any) => {
        this.#logSuccessfulRequest(
          context,
          request,
          response,
          startTime,
          method,
          url,
          userAgent,
        );
      }),
      catchError((error: any) => {
        this.#logFailedRequest(
          request,
          error,
          startTime,
          method,
          url,
          userAgent,
        );
        return throwError(() => error);
      }),
    );
  }

  /**
   * Determines user agent type based on header information
   * @param userAgentHeader - Raw user agent header from request
   * @returns Simplified user agent type
   */
  #getUserAgentType(userAgentHeader: string): string {
    if (userAgentHeader.includes('okhttp')) {
      return 'Mobile';
    } else if (userAgentHeader.includes('axios')) {
      return 'Web';
    }
    return userAgentHeader;
  }

  /**
   * Logs details for successful requests
   */
  #logSuccessfulRequest(
    context: ExecutionContext,
    request: any,
    response: any,
    startTime: number,
    method: string,
    url: string,
    userAgent: string,
  ): void {
    const responseTime = (Date.now() - startTime).toFixed(2);
    const statusCode = context.switchToHttp().getResponse().statusCode;

    this.logger.log(this.dividerLine);
    this.logger.log(`Req: ${method} ${url} - ${userAgent}`);
    this.logger.log(`Req Body:\n${JSON.stringify(request.body, null, 2)}`);
    this.logger.log(`Res: ${statusCode}, ${responseTime} ms`);
    this.logger.log(`Res Body:\n${JSON.stringify(response, null, 2)}`);
    this.logger.log(this.dividerLine);
  }

  /**
   * Logs details for failed requests
   */
  #logFailedRequest(
    request: any,
    error: any,
    startTime: number,
    method: string,
    url: string,
    userAgent: string,
  ): void {
    const responseTime = (Date.now() - startTime).toFixed(2);
    const statusCode = error instanceof HttpException ? error.getStatus() : 500;

    this.logger.log(this.dividerLine);
    this.logger.log(`Req: ${method} ${url} - ${userAgent}`);
    this.logger.log(`Req Body:\n${JSON.stringify(request.body, null, 2)}`);
    this.logger.error(`Res: ${statusCode}, ${responseTime} ms`);
    this.logger.error(`Error: ${error.message}\n`);
    this.logger.log(this.dividerLine);
  }
}
