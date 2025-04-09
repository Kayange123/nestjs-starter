import { Injectable } from '@nestjs/common';

import { AppConfigService } from 'src/config/app-config.service';

@Injectable()
export class AppService {
  constructor(private readonly appConfig: AppConfigService) {}

  welcome(): string {
    return `${this.appConfig.appDescription}, Docs: '/v1/docs'`;
  }
}
