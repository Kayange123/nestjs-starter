import { Test } from '@nestjs/testing';
import { HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './controllers/health.controller';
import { AppConfigService } from '../../config/app-config.service';

describe('HealthController', () => {
  let controller: HealthController;
  const pingCheck = jest.fn();
  beforeEach(async () => {
    pingCheck.mockReset().mockResolvedValue({ database: { status: 'up' } });
    const module = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: {
            check: async (checks) =>
              Promise.all(checks.map((check) => check())),
          },
        },
        { provide: TypeOrmHealthIndicator, useValue: { pingCheck } },
        {
          provide: AppConfigService,
          useValue: { operations: { healthTimeoutMs: 1000 } },
        },
      ],
    }).compile();
    controller = module.get(HealthController);
  });
  it('checks the database with a timeout and exposes only readiness', async () => {
    expect(await controller.ready()).toEqual({ status: 'ok' });
    expect(pingCheck).toHaveBeenCalledWith('database', { timeout: 1000 });
  });
  it('returns sanitized failure when the database is unavailable', async () => {
    pingCheck.mockRejectedValue(new Error('private database credentials'));
    await expect(controller.check()).rejects.toEqual(
      new ServiceUnavailableException('Service not ready'),
    );
  });
  it('keeps liveness independent of dependencies', () => {
    expect(controller.ping().status).toBe('ok');
    expect(pingCheck).not.toHaveBeenCalled();
  });
});
