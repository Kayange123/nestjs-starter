import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  // We can override methods here if needed for custom behavior
  // For example, to extract the user ID for more granular rate limiting
  // protected getTracker(req: Record<string, any>): string {
  //   return req.user?.id ? `${req.user.id}` : super.getTracker(req);
  // }
}
