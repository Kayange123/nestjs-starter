import * as Tokens from 'csrf';
import { Request, Response, NextFunction } from 'express';
import { Injectable, NestMiddleware } from '@nestjs/common';

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  private tokens = new Tokens();

  use(req: Request, res: Response, next: NextFunction) {
    // Skip CSRF check for non-mutating methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      // Generate token for GET requests
      this.#generateToken(req, res);
      return next();
    }

    // For POST, PUT, DELETE, etc. - validate CSRF token
    const token =
      req.headers['csrf-token'] ||
      req.headers['x-csrf-token'] ||
      req.body?._csrf;
    const secret = req.cookies?.['csrf-secret'];

    if (!secret) {
      return res.status(403).json({ message: 'CSRF secret not found' });
    }

    if (!token || !this.tokens.verify(secret, token as string)) {
      return res.status(403).json({ message: 'Invalid CSRF token' });
    }

    next();
  }

  #generateToken(req: Request, res: Response): void {
    // Create a secret if it doesn't exist
    if (!req.cookies?.['csrf-secret']) {
      const secret = this.tokens.secretSync();
      res.cookie('csrf-secret', secret, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      });

      // Generate token from the secret and expose it in a response header
      const token = this.tokens.create(secret);
      res.setHeader('csrf-token', token);
    }
  }
}
