import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppConfigService } from '../../../config/app-config.service';

@ApiTags('health')
@SkipThrottle({ default: true, global: true })
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly database: TypeOrmHealthIndicator,
    private readonly config: AppConfigService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Database readiness (alias of /health/ready)' })
  @ApiResponse({ status: 200, description: 'Ready: data.status is ok' })
  @ApiResponse({
    status: 503,
    description: 'Not ready; dependency details are withheld',
  })
  async check(): Promise<{ status: string }> {
    try {
      await this.health.check([
        () =>
          this.database.pingCheck('database', {
            timeout: this.config.operations.healthTimeoutMs,
          }),
      ]);
      return { status: 'ok' };
    } catch {
      throw new ServiceUnavailableException('Service not ready');
    }
  }

  @Get('ready')
  @ApiOperation({ summary: 'Check database readiness' })
  ready(): Promise<{ status: string }> {
    return this.check();
  }

  @Get('ping')
  @ApiOperation({ summary: 'Process liveness without dependency checks' })
  ping(): { status: string; timestamp: string } {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
