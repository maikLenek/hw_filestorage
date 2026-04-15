import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { HotStorageService } from '../storage/hot-storage.service';
import { ArchiveStorageService } from '../storage/archive-storage.service';
import { FileCacheService } from '../cache/file-cache.service';
import { ArchiveJobDto } from './dto/archive-job.dto';

@Controller()
export class ArchivalWorker {
  private readonly logger = new Logger(ArchivalWorker.name);

  constructor(
    private readonly hotStorageService: HotStorageService,
    private readonly archiveStorageService: ArchiveStorageService,
    private readonly fileCacheService: FileCacheService,
  ) {}

  @EventPattern('archive_file')
  async handle(
    @Payload() data: ArchiveJobDto,
    @Ctx() ctx: RmqContext,
  ): Promise<void> {
    const channel = ctx.getChannelRef();
    const message = ctx.getMessage();
    const { type, id, createdAt } = data;

    try {
      const current = await this.fileCacheService.getFileMeta(type, id);
      if (current?.location === 'archive') {
        this.logger.log(
          `filestorage:archival skip type=${type} id=${id} reason=already-archived`,
        );
        channel.ack(message);
        return;
      }

      const streamableFile = await this.hotStorageService.read(type, id);
      const stream = streamableFile.getStream();

      const contentType = current?.contentType ?? 'application/octet-stream';
      const contentLength = -1;

      await this.archiveStorageService.put(
        type,
        id,
        stream,
        contentLength,
        contentType,
      );

      await this.hotStorageService.delete(type, id);

      await this.fileCacheService.setFileMeta(type, id, {
        type,
        id,
        location: 'archive',
        createdAt,
        contentType,
      });

      channel.ack(message);

      this.logger.log(
        `filestorage:archival type=${type} id=${id} moved=hot→archive`,
      );
    } catch (err) {
      this.logger.error(
        `filestorage:archival error type=${type} id=${id}`,
        (err as Error).stack,
      );

      channel.nack(message, false, false);
    }
  }
}
