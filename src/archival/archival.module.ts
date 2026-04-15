import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ArchivalWorker } from './archival.worker';
import { ArchivalScheduler } from './archival.scheduler';
import { StorageModule } from '../storage/storage.module';

export const ARCHIVAL_SERVICE = 'ARCHIVAL_SERVICE';

@Module({
  imports: [
    ConfigModule,
    StorageModule,
    ClientsModule.registerAsync([
      {
        name: ARCHIVAL_SERVICE,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.get<string>('app.rabbitmq.url')] as string[],
            queue: 'filestorage_archival',
            queueOptions: {
              durable: true,
              arguments: {
                'x-dead-letter-exchange': 'filestorage_archival_dlx',
              },
            },
          },
        }),
      },
    ]),
  ],
  controllers: [ArchivalWorker],
  providers: [ArchivalScheduler],
  exports: [ClientsModule],
})
export class ArchivalModule {}
