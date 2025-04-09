import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';

/**
 * ResponseInterceptor ensures a consistent response format
 * by wrapping all responses in a data property if they don't already have one.
 */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  /**
   * Intercepts the response and ensures it follows a consistent structure
   * @param context - The execution context
   * @param next - The next handler in the chain
   * @returns Observable with standardized response format
   */
  intercept(_: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((result: any) => {
        // Preserve existing structure if result already has data property
        // Otherwise, wrap the result in a data property
        return result?.data ? { ...result } : { data: result };
      }),
    );
  }
}
