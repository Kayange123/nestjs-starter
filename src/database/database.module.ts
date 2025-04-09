import { Module } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';

import { AppConfigModule } from 'src/config/app-config.module';
import { AppConfigService } from 'src/config/app-config.service';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (appConfig: AppConfigService): TypeOrmModuleOptions => ({
        type: 'postgres',
        host: appConfig.db.host,
        port: appConfig.db.port,
        username: appConfig.db.user,
        password: appConfig.db.password,
        database: appConfig.db.name,
        entities: ['dist/**/*.entity.{ts,js}'],
        synchronize: appConfig.db.sync,
        logging: appConfig.db.logging,
      }),
    }),
  ],
})
export class DatabaseModule {}
