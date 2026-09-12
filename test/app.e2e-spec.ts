import * as request from 'supertest';
import { INestApplication, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';
import { AppConfigService } from '../src/config/app-config.service';
import { ResponseInterceptor } from '../src/interceptors/response.interceptor';

describe('Application welcome HTTP contract', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: AppConfigService,
          useValue: {
            appDescription: 'Test API',
            operations: { swaggerEnabled: true },
          },
        },
      ],
    }).compile();
    app = module.createNestApplication();
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();
    await app.listen(0, '127.0.0.1');
  });
  afterAll(async () => {
    await app?.close();
  });
  it('returns the configured description in the response envelope', async () => {
    await request(app.getHttpServer())
      .get('/v1')
      .expect(200)
      .expect({ data: "Test API, Docs: '/docs'" });
  });
});
