import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './controllers/health.controller';
import { AppConfigModule } from '../../config/app-config.module';

@Module({
  imports: [TerminusModule.forRoot({ logger: false }), AppConfigModule],
  controllers: [HealthController],
})
export class HealthModule {}
