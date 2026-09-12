import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { appConfigSchema } from 'src/config/app-config.schema';
import { AppConfigService } from 'src/config/app-config.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      validate: (env: Record<string, unknown>) => {
        const result = appConfigSchema.validate(env, {
          allowUnknown: true,
          abortEarly: false,
        });
        if (result.error)
          throw new Error(
            `Invalid configuration fields: ${result.error.details.map((detail) => detail.path.join('.')).join(', ')}`,
          );
        return result.value;
      },
      isGlobal: true,
    }),
  ],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}
