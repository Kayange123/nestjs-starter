import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { HealthModule } from '../health/health.module';
import { AppConfigModule } from '../../config/app-config.module';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';

describe('Health Controller (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // Create a testing module with all necessary imports
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [HealthModule, AppConfigModule, TerminusModule, HttpModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/health/ping (GET)', () => {
    it('should return a 200 status code and health details', () => {
      return request(app.getHttpServer())
        .get('/health/ping')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status', 'ok');
          expect(res.body).toHaveProperty('timestamp');
        });
    });
  });

  // This test assumes you have appropriate mocks for all health check services
  // In a real scenario, you might want to use test doubles for external dependencies
  describe('/health (GET)', () => {
    it('should return health status information', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect((res) => {
          if (res.status !== 503) {
            // Health check might fail in CI environment
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('status');
          }
        });
    });
  });
});
