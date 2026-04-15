import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { ClientProxy } from '@nestjs/microservices';
import { CronJob } from 'cron';
import Redis from 'ioredis';
import { REDIS_CLIENT } from 'src/cache/cache.constants';
import { ARCHIVAL_SERVICE } from './archival.module';
import { FileCacheService } from '../cache/file-cache.service';

@Injectable()
export class ArchivalScheduler implements OnModuleInit {
  private readonly logger = new Logger(ArchivalScheduler.name);
  private isRunning = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(ARCHIVAL_SERVICE) private readonly clientProxy: ClientProxy,
    private readonly fileCacheService: FileCacheService,
  ) {}

  async onModuleInit(): Promise<void> {
    const cronExpression = this.configService.get<string>(
      'app.archival.cronExpression',
    );

    const job = new (CronJob as any)({
      cronTime: cronExpression,
      onTick: () => this.run(),
      start: false,
      waitForCompletion: true,
    });

    this.schedulerRegistry.addCronJob('archival', job);
    job.start();

    this.logger.log(
      `filestorage:archival scheduler registered cron="${cronExpression}"`,
    );
  }

  private async run(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn(
        'filestorage:archival scheduler-skip reason=already-running',
      );
      return;
    }

    this.isRunning = true;
    const startedAt = Date.now();
    let enqueued = 0;

    this.logger.log('filestorage:archival scheduler-start');

    try {
      const archiveAfterMs =
        this.configService.get('ARCHIVE_AFTER_SECONDS', { infer: true }) * 1000;

      for await (const keys of this.scanKeys('file:*:*', 100)) {
        for (const key of keys) {
          try {
            const parts = key.split(':');
            if (parts.length < 3) continue;
            const [, type, ...idParts] = parts;
            const id = idParts.join(':');

            if (!type || !id) continue;

            const meta = await this.fileCacheService.getFileMeta(type, id);
            if (!meta || meta.location !== 'hot') continue;

            const age = Date.now() - new Date(meta.createdAt).getTime();
            if (age < archiveAfterMs) continue;

            this.clientProxy
              .emit('archive_file', { type, id, createdAt: meta.createdAt })
              .subscribe({
                error: (err) =>
                  this.logger.error(
                    `filestorage:archival emit-error type=${type} id=${id}`,
                    err,
                  ),
              });
            enqueued++;
          } catch (err) {
            this.logger.error(
              `filestorage:archival key-error key=${key}`,
              (err as Error).stack,
            );
          }
        }
      }
    } catch (err) {
      this.logger.error(
        'filestorage:archival scheduler-error',
        (err as Error).stack,
      );
    } finally {
      const elapsed = Date.now() - startedAt;
      this.logger.log(
        `filestorage:archival scheduler-end enqueued=${enqueued} elapsed=${elapsed}ms`,
      );
      this.isRunning = false;
    }
  }

  private async *scanKeys(
    pattern: string,
    count: number,
  ): AsyncGenerator<string[]> {
    let cursor = '0';

    do {
      const [nextCursor, keys] = await this.redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        count,
      );
      cursor = nextCursor;

      if (keys.length > 0) {
        yield keys;
      }
    } while (cursor !== '0');
  }
}
