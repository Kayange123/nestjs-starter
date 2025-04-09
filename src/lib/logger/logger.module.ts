import { Global, Module } from '@nestjs/common';
import { AppConfigService } from 'src/config/app-config.service';

import { LoggerService } from 'src/lib/logger/logger.service';

@Global()
@Module({
  providers: [LoggerService, AppConfigService],
  exports: [LoggerService],
})
export class LoggerModule {}
