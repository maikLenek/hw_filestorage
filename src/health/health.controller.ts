import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisOptions, RmqOptions, Transport } from '@nestjs/microservices';
import {
  DiskHealthIndicator,
  HealthCheck,
  HealthCheckService,
  MicroserviceHealthIndicator,
} from '@nestjs/terminus';

@Controller({
  path: 'health',
  version: VERSION_NEUTRAL,
})
export class HealthController {
  constructor(
    private configService: ConfigService,
    private health: HealthCheckService,
    private microservice: MicroserviceHealthIndicator,
    private readonly disk: DiskHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    const storagePath =
      this.configService.get<string>('app.hotStorage.path') ?? '/hot-storage';
    return this.health.check([
      async () =>
        this.disk.checkStorage('storage', {
          path: storagePath,
          thresholdPercent: 0.9,
        }),
      async () =>
        this.microservice.pingCheck<RedisOptions>('redis', {
          transport: Transport.REDIS,
          options: {
            host: this.configService.getOrThrow<string>('app.redis.host'),
            port: this.configService.getOrThrow<number>('app.redis.port'),
          },
        }),
      async () =>
        this.microservice.pingCheck<RmqOptions>('rabbitmq', {
          transport: Transport.RMQ,
          options: {
            urls: [this.configService.getOrThrow<string>('app.rabbitmq.url')],
            queue: 'filestorage_archival',
            queueOptions: {
              durable: true,
              arguments: {
                'x-dead-letter-exchange': 'filestorage_archival_dlx',
                'x-dead-letter-routing-key': 'filestorage_archival_dlx',
              },
            },
            prefetchCount: 10,
          },
        }),
    ]);
  }
}
