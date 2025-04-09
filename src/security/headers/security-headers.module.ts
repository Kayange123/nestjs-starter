import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';

import { SecurityHeadersMiddleware } from 'src/security/headers/security-headers.middleware';

@Module({})
export class SecurityHeadersModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SecurityHeadersMiddleware).forRoutes('*');
  }
}
