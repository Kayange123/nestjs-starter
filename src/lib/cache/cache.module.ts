import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';

import { AppConfigModule } from 'src/config/app-config.module';
import { AppConfigService } from 'src/config/app-config.service';

@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: async (configService: AppConfigService) => {
        return {
          ttl: configService.cache.ttl, // cache for 5 minutes by default
          max: 100, // maximum number of items in cache
          isGlobal: true,
        };
      },
    }),
  ],
  exports: [CacheModule],
})
export class AppCacheModule {}
