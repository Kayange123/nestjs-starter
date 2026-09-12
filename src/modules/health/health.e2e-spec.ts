import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { HealthController } from './controllers/health.controller';
import { TerminusModule } from '@nestjs/terminus';
import { AppConfigService } from '../../config/app-config.service';

import { Module } from '@nestjs/common';
import { TypeOrmHealthIndicator } from '@nestjs/terminus';

@Module({
  providers: [{ provide: AppConfigService, useValue: { port: 3030 } }],
  exports: [AppConfigService],
})
class TestConfigModule {}

describe('Health HTTP contract (database probe mocked)', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [TerminusModule, TestConfigModule],
      controllers: [HealthController],
    })
      .overrideProvider(TypeOrmHealthIndicator)
      .useValue({ pingCheck: async () => ({ api: { status: 'up' } }) })
      .compile();
    app = module.createNestApplication();
    await app.init();
    await app.listen(0, '127.0.0.1');
  });
  afterAll(async () => {
    await app?.close();
  });
  it('returns the liveness response', async () => {
    const response = await request(app.getHttpServer())
      .get('/health/ping')
      .expect(200);
    expect(response.body.status).toBe('ok');
    expect(new Date(response.body.timestamp).toISOString()).toBe(
      response.body.timestamp,
    );
  });
});
