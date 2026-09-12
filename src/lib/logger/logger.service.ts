import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import * as winston from 'winston';
import { AppConfigService } from '../../config/app-config.service';

@Injectable()
export class LoggerService implements NestLoggerService {
  private readonly logger: winston.Logger;

  constructor(config: AppConfigService) {
    this.logger = winston.createLogger({
      level: config.operations.logLevel,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
      defaultMeta: { service: config.appName },
      transports: [new winston.transports.Console()],
    });
  }

  log(message: unknown, context?: string) {
    this.logger.log({
      level: 'info',
      message:
        message instanceof Error
          ? message.name
          : typeof message === 'string'
            ? message
            : 'Application event',
      details:
        message && typeof message === 'object' && !(message instanceof Error)
          ? message
          : undefined,
      context,
    });
  }
  error(message: unknown, _trace?: string, context?: string) {
    this.logger.log({
      level: 'error',
      message:
        message instanceof Error
          ? message.name
          : typeof message === 'string'
            ? message
            : 'Application event',
      details:
        message && typeof message === 'object' && !(message instanceof Error)
          ? message
          : undefined,
      context,
    });
  }
  warn(message: unknown, context?: string) {
    this.logger.log({
      level: 'warn',
      message:
        message instanceof Error
          ? message.name
          : typeof message === 'string'
            ? message
            : 'Application event',
      details:
        message && typeof message === 'object' && !(message instanceof Error)
          ? message
          : undefined,
      context,
    });
  }
  debug(message: unknown, context?: string) {
    this.logger.log({
      level: 'debug',
      message:
        message instanceof Error
          ? message.name
          : typeof message === 'string'
            ? message
            : 'Application event',
      details:
        message && typeof message === 'object' && !(message instanceof Error)
          ? message
          : undefined,
      context,
    });
  }
  verbose(message: unknown, context?: string) {
    this.logger.log({
      level: 'verbose',
      message:
        message instanceof Error
          ? message.name
          : typeof message === 'string'
            ? message
            : 'Application event',
      details:
        message && typeof message === 'object' && !(message instanceof Error)
          ? message
          : undefined,
      context,
    });
  }
}
