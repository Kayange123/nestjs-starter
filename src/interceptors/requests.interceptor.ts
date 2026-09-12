import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class RequestsInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestsInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const started = Date.now();
    const log = (statusCode: number) =>
      this.logger.log({
        method: request.method,
        // Route templates exclude query strings and user-controlled identifiers.
        route: request.route?.path ?? 'unmatched',
        statusCode,
        durationMs: Date.now() - started,
      });
    return next.handle().pipe(
      tap({
        next: () => log(response.statusCode),
        error: (error: unknown) =>
          log(error instanceof HttpException ? error.getStatus() : 500),
      }),
    );
  }
}
