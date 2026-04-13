import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('filestorage:bootstrap');

  app.enableVersioning({
    type: VersioningType.URI,
    prefix: 'v',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const rmqUrl = configService.getOrThrow<string>('app.rabbitmq.url');

  app.connectMicroservice<MicroserviceOptions>(
    {
      transport: Transport.RMQ,
      options: {
        urls: [rmqUrl],
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
    },
    {
      inheritAppConfig: true,
    },
  );

  logger.log('RabbitMQ consumer attached');

  await app.startAllMicroservices();
  logger.log('All microservices started');

  const port = configService.get<number>('app.port', 3000);
  await app.listen(port);

  logger.log(`Application listening on http://localhost:${port}`);
  logger.log(`HTTP versioning /v1 /v2 ...`);
  logger.log('RabbitMQ consumer active');
  logger.log('LETs ROOOOOOLL ᕙ(  •̀ ᗜ •́  )ᕗ');
}
bootstrap().catch((error) => {
  const logger = new Logger('filestorage:bootstrap-error');
  logger.error('Application startup failed ಥ﹏ಥ', error);
  process.exit(1);
});
