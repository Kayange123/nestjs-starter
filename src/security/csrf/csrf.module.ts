import * as session from 'express-session';
import * as cookieParser from 'cookie-parser';
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';

import { CsrfMiddleware } from 'src/security/csrf/csrf.middleware';

@Module({})
export class CsrfModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply cookie parser globally for CSRF cookie support
    consumer
      .apply(
        cookieParser(),
        session({
          secret: process.env.SESSION_SECRET || 'secure-session-secret',
          resave: false,
          saveUninitialized: false,
          cookie: {
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            sameSite: 'strict',
          },
        }),
        CsrfMiddleware,
      )
      .forRoutes('*');
  }
}
