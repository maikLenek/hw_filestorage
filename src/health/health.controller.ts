import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisOptions, RmqOptions, Transport } from '@nestjs/microservices';
import {
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
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      // TODO: Add health check for redis
      // TODO: Add healt check for disk
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
