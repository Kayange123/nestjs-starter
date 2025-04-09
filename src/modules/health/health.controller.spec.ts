import {
  HealthCheckService,
  HttpHealthIndicator,
  DiskHealthIndicator,
  MemoryHealthIndicator,
} from '@nestjs/terminus';
import { Test, TestingModule } from '@nestjs/testing';
import { AppConfigService } from '../../config/app-config.service';
import { HealthController } from '../health/controllers/health.controller';

describe('HealthController', () => {
  let controller: HealthController;
  let healthService: HealthCheckService;
  let httpHealthIndicator: HttpHealthIndicator;
  let diskHealthIndicator: DiskHealthIndicator;
  let memoryHealthIndicator: MemoryHealthIndicator;
  let configService: AppConfigService;

  // Mock services
  const mockHealthCheckService = {
    check: jest.fn().mockImplementation((checks) => {
      // Execute each check function to improve coverage
      checks.forEach((check) => check());
      return Promise.resolve({
        status: 'ok',
        info: { api: { status: 'up' } },
        details: { api: { status: 'up' } },
      });
    }),
  };

  const mockHttpHealthIndicator = {
    pingCheck: jest.fn().mockResolvedValue({
      api: { status: 'up' },
    }),
  };

  const mockDiskHealthIndicator = {
    checkStorage: jest.fn().mockResolvedValue({
      disk_health: { status: 'up' },
    }),
  };

  const mockMemoryHealthIndicator = {
    checkHeap: jest.fn().mockResolvedValue({
      memory_heap: { status: 'up' },
    }),
    checkRSS: jest.fn().mockResolvedValue({
      memory_rss: { status: 'up' },
    }),
  };

  const mockConfigService = {
    port: 3030,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: mockHealthCheckService },
        { provide: HttpHealthIndicator, useValue: mockHttpHealthIndicator },
        { provide: DiskHealthIndicator, useValue: mockDiskHealthIndicator },
        { provide: MemoryHealthIndicator, useValue: mockMemoryHealthIndicator },
        { provide: AppConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthService = module.get<HealthCheckService>(HealthCheckService);
    httpHealthIndicator = module.get<HttpHealthIndicator>(HttpHealthIndicator);
    diskHealthIndicator = module.get<DiskHealthIndicator>(DiskHealthIndicator);
    memoryHealthIndicator = module.get<MemoryHealthIndicator>(
      MemoryHealthIndicator,
    );
    configService = module.get<AppConfigService>(AppConfigService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check', () => {
    it('should return the health check results', async () => {
      const result = await controller.check();

      expect(result).toEqual({
        status: 'ok',
        info: { api: { status: 'up' } },
        details: { api: { status: 'up' } },
      });

      expect(healthService.check).toHaveBeenCalled();
    });

    it('should check HTTP endpoint availability', async () => {
      await controller.check();

      expect(httpHealthIndicator.pingCheck).toHaveBeenCalledWith(
        'api',
        `http://localhost:${configService.port}/v1/health/ping`,
      );
    });

    it('should check disk storage', async () => {
      await controller.check();

      expect(diskHealthIndicator.checkStorage).toHaveBeenCalledWith(
        'disk_health',
        {
          thresholdPercent: 0.9,
          path: '/',
        },
      );
    });

    it('should check memory usage', async () => {
      await controller.check();

      expect(memoryHealthIndicator.checkHeap).toHaveBeenCalledWith(
        'memory_heap',
        300 * 1024 * 1024,
      );
      expect(memoryHealthIndicator.checkRSS).toHaveBeenCalledWith(
        'memory_rss',
        300 * 1024 * 1024,
      );
    });
  });

  describe('ping', () => {
    it('should return ok status with timestamp', () => {
      const mockDate = new Date('2023-01-01T00:00:00.000Z');
      jest.spyOn(global, 'Date').mockImplementationOnce(() => mockDate as any);

      const result = controller.ping();

      expect(result).toEqual({
        status: 'ok',
        timestamp: '2023-01-01T00:00:00.000Z',
      });
    });
  });
});
