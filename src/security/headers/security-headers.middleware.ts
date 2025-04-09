import { Request, Response, NextFunction } from 'express';
import { Injectable, NestMiddleware } from '@nestjs/common';

/**
 * SecurityHeadersMiddleware adds additional security headers beyond what Helmet provides
 * This middleware implements security best practices for HTTP headers
 */
@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Prevent browsers from trying to detect MIME types (prevents XSS via MIME sniffing)
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Enable browser XSS filtering capability
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Prevent clickjacking by controlling iframe embeds
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');

    // Control browser features (camera, geolocation, etc.)
    res.setHeader(
      'Permissions-Policy',
      'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',
    );

    // Control where resources can be loaded from
    if (process.env.NODE_ENV === 'production') {
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'",
      );
    }

    // Remove powered by header for security through obscurity
    res.removeHeader('X-Powered-By');

    next();
  }
}
