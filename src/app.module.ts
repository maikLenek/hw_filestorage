import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration, { configValidationSchema } from './config/configuration';
import { ScheduleModule } from '@nestjs/schedule';
import { HealthModule } from './health/health.module';
import { StorageModule } from './storage/storage.module';
import { FileCacheModule } from './cache/file-cache.module';
import { FilesModule } from './files/files.module';
import { ArchivalModule } from './archival/archival.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [configuration],
      validationSchema: configValidationSchema,
      validationOptions: {
        stopAtFirstError: true,
      },
    }),
    ScheduleModule.forRoot(),
    HealthModule,
    StorageModule,
    FileCacheModule,
    FilesModule,
    ArchivalModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
