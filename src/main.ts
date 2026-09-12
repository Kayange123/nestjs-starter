import { NestFactory } from '@nestjs/core';
import { AppConfigService } from './config/app-config.service';
import { configureApp } from './configure-app';

async function bootstrap(): Promise<void> {
  // Import inside the error boundary so invalid environment configuration is sanitized.
  const { AppModule } = await import('./app.module');
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
    logger: false,
    abortOnError: false,
  });
  try {
    configureApp(app);
    await app.listen(app.get(AppConfigService).port, '0.0.0.0');
  } catch (error) {
    await app.close();
    throw error;
  }
}

void bootstrap().catch(() => {
  process.stderr.write(
    'Application startup failed. Check configuration and database connectivity.\n',
  );
  process.exitCode = 1;
});
