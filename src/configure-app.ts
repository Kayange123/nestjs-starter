import {
  HttpException,
  INestApplication,
  VersioningType,
} from '@nestjs/common';
import { json, urlencoded } from 'express';
import { randomUUID } from 'crypto';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppConfigService } from './config/app-config.service';
import { LoggerService } from './lib/logger/logger.service';
import { GlobalExceptionFilter } from './filters/global-exception.filter';
import { ResponseInterceptor } from './interceptors/response.interceptor';
import { createValidationPipe } from './pipes/validation.pipe';

/** Shared by production bootstrap and HTTP integration tests. Create Nest with bodyParser:false. */
export function configureApp(app: INestApplication): void {
  const config = app.get(AppConfigService);
  const options = config.operations;
  const logger = app.get(LoggerService);
  app.useLogger(logger);
  app.enableShutdownHooks(['SIGTERM', 'SIGINT']);
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'v',
  });
  // Direct deployment default: do not trust arbitrary forwarded client addresses.
  app.getHttpAdapter().getInstance().set('trust proxy', false);
  app.use((req, res, next) => {
    const requestId = randomUUID();
    const started = Date.now();
    res.setHeader('x-request-id', requestId);
    res.on('finish', () =>
      logger.log(
        {
          requestId,
          method: req.method,
          route: req.route?.path ?? 'unmatched',
          statusCode: res.statusCode,
          durationMs: Date.now() - started,
        },
        'HTTP',
      ),
    );
    next();
  });
  app.use(helmet());
  app.enableCors({
    origin: options.corsOrigins,
    credentials: false,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['x-request-id'],
  });
  app.use(json({ limit: options.bodyLimitBytes }));
  app.use(
    urlencoded({
      extended: false,
      limit: options.bodyLimitBytes,
      parameterLimit: 100,
    }),
  );
  app.use((error, _req, _res, next) => {
    if (
      error?.type === 'entity.too.large' ||
      error?.type === 'parameters.too.many'
    )
      return next(new HttpException('Request body too large', 413));
    if (error?.type === 'entity.parse.failed')
      return next(new HttpException('Malformed request body', 400));
    next(error);
  });
  app.useGlobalFilters(new GlobalExceptionFilter(config.nodeEnv));
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalPipes(createValidationPipe());
  if (options.swaggerEnabled) {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle(config.appName)
        .setDescription(config.appDescription)
        .setVersion('1.0')
        .addBearerAuth(
          { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
          'JWT-auth',
        )
        .build(),
    );
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: { persistAuthorization: false },
    });
  }
}
