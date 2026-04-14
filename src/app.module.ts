import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration, { configValidationSchema } from './config/configuration';
import { ScheduleModule } from '@nestjs/schedule';
import { HealthModule } from './health/health.module';
import { StorageModule } from './storage/storage.module';
import { FileCacheModule } from './cache/file-cache.module';
import { CacheModule } from '@nestjs/cache-manager';
import { CacheableMemory, Keyv } from 'cacheable';
import { FilesModule } from './files/files.module';

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
    CacheModule.register({
      stores: [
        new Keyv({
          store: new CacheableMemory({ ttl: 60000, lruSize: 5000 }),
        }),
      ],
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    HealthModule,
    StorageModule,
    FileCacheModule,
    FilesModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
