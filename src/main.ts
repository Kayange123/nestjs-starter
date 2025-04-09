import helmet from 'helmet';
import { json } from 'body-parser';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from 'src/app.module';
import { AppConfigService } from 'src/config/app-config.service';
import { HttpStatusFilter } from 'src/filters/http-status.filter';
import { RequestsInterceptor } from 'src/interceptors/requests.interceptor';
import { ResponseInterceptor } from 'src/interceptors/response.interceptor';
import { GlobalExceptionFilter } from 'src/filters/global-exception.filter';
import { DatabaseExceptionFilter } from 'src/filters/database-exception.filter';
import { ValidationExceptionFilter } from 'src/filters/validation-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const appConfig = app.get(AppConfigService);

  // Enable API versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'v',
  });

  app.enableCors({
    origin: true,
    methods: 'HEAD,OPTIONS,GET,PUT,PATCH,POST,DELETE,',
    credentials: true,
  });

  app.use(
    helmet({
      contentSecurityPolicy: false,
    }),
  );

  app.use(json({ limit: '100mb' }));

  app.useGlobalFilters(
    new ValidationExceptionFilter(),
    new DatabaseExceptionFilter(),
    new HttpStatusFilter(),
    new GlobalExceptionFilter(appConfig.nodeEnv),
  );

  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalInterceptors(new RequestsInterceptor());
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      // Enable detailed error messages
      exceptionFactory: (errors) => {
        return {
          statusCode: 400,
          message: errors,
        };
      },
    }),
  );

  // Configure Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('NestJS API Starter Kit')
    .setDescription(
      'A comprehensive API documentation for the NestJS starter kit',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management endpoints')
    .addTag('health', 'Application health monitoring')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(appConfig.port, '0.0.0.0');
  console.log(`Application is running on: ${appConfig.port}`);
  console.log(
    `API Documentation available at: http://localhost:${appConfig.port}/docs`,
  );
}
bootstrap().then((r) => r);
