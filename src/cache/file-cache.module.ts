import { Global, Module } from '@nestjs/common';
import { FileCacheService } from './file-cache.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { CacheableMemory, Keyv } from 'cacheable';
import KeyvRedis from '@keyv/redis';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';
@Global()
@Module({
  imports: [
    ConfigModule,
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (confgService: ConfigService) => {
        const redisHost = confgService.get<string>('app.redis.host');
        const redisPort = confgService.get<number>('app.redis.port');

        const redisUrl = `redis://${redisHost}:${redisPort}`;
        return {
          stores: [
            new Keyv({
              store: new CacheableMemory({ ttl: 60_000, lruSize: 10_000 }),
            }),
            new Keyv({
              store: new KeyvRedis(redisUrl),
            }),
          ],
        };
      },
    }),
  ],
  providers: [
    FileCacheService,
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): Redis => {
        return new Redis({
          host: configService.get('app.redis.host'),
          port: configService.get('app.redis.port'),
          lazyConnect: true,
          retryStrategy: (times) => Math.min(times * 200, 30_000),
        });
      },
    },
  ],
  exports: [FileCacheService, REDIS_CLIENT, CacheModule],
})
export class FileCacheModule {}
