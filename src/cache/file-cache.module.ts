import { Global, Module } from '@nestjs/common';
import { FileCacheService } from './file-cache.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { CacheableMemory, Keyv } from 'cacheable';

@Global()
@Module({
  imports: [
    ConfigModule,
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: () => {
        // TODO: implement REDIS cache
        return {
          stores: [
            new Keyv({
              store: new CacheableMemory({ ttl: 60_000, lruSize: 10_000 }),
            }),
          ],
        };
      },
    }),
  ],
  providers: [FileCacheService],
  exports: [FileCacheService, CacheModule],
})
export class FileCacheModule {}
