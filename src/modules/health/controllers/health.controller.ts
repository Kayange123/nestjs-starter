import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HttpHealthIndicator,
  DiskHealthIndicator,
  MemoryHealthIndicator,
  HealthCheckResult,
} from '@nestjs/terminus';

import { AppConfigService } from '../../../config/app-config.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private disk: DiskHealthIndicator,
    private memory: MemoryHealthIndicator,
    private config: AppConfigService,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Check API health status' })
  @ApiResponse({
    status: 200,
    description:
      'API health status information including disk and memory metrics',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          example: 'ok',
          description: 'Overall health status',
        },
        info: {
          type: 'object',
          description: 'Health information for each component',
          additionalProperties: {
            type: 'object',
            properties: {
              status: { type: 'string', example: 'up' },
            },
          },
        },
        details: {
          type: 'object',
          description: 'Detailed health metrics',
          additionalProperties: {
            type: 'object',
            properties: {
              status: { type: 'string', example: 'up' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 503, description: 'Service unavailable' })
  check(): Promise<HealthCheckResult> {
    return this.health.check([
      // Check if the application is running
      () =>
        this.http.pingCheck(
          'api',
          `http://localhost:${this.config.port}/v1/health/ping`,
        ),
      // Check available disk storage
      () =>
        this.disk.checkStorage('disk_health', {
          thresholdPercent: 0.9,
          path: '/',
        }),
      // Check memory usage
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 300 * 1024 * 1024),
    ]);
  }

  @Get('ping')
  @ApiOperation({ summary: 'Simple ping endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Simple response to verify API is responsive',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2023-01-01T00:00:00.000Z' },
      },
    },
  })
  ping() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
