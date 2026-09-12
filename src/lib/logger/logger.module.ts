import { Global, Module } from '@nestjs/common';
import { AppConfigModule } from '../../config/app-config.module';

import { LoggerService } from 'src/lib/logger/logger.service';

@Global()
@Module({
  imports: [AppConfigModule],
  providers: [LoggerService],
  exports: [LoggerService],
})
export class LoggerModule {}
