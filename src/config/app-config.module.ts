import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { appConfigSchema } from 'src/config/app-config.schema';
import { AppConfigService } from 'src/config/app-config.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      validationSchema: appConfigSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
      isGlobal: true,
    }),
  ],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}
