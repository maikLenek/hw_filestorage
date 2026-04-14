import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileCacheService } from '../cache/file-cache.service';
import { HotStorageService } from '../storage/hot-storage.service';
import { UploadFileResponseDto } from './dto/upload-file.dto';

@Injectable()
export class FilesService {
  private logger = new Logger(FilesService.name);

  constructor(
    private configService: ConfigService,
    private fileCacheService: FileCacheService,
    private hotStorageService: HotStorageService,
  ) {}

  async upload(
    type: string,
    id: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<UploadFileResponseDto> {
    const existing = await this.fileCacheService.getFileMeta(type, id);
    if (existing) {
      throw new ConflictException({
        statusCode: 409,
        message: 'File already exists',
        type,
        id,
      });
    }

    this.logger.log(
      `filestorage:upload type=${type} id=${id} size=${buffer.length}`,
    );

    this.hotStorageService.write(type, id, buffer, buffer.length);

    const createdAt = new Date().toISOString();

    await this.fileCacheService.setFileMeta(type, id, {
      type,
      id,
      location: 'hot',
      createdAt,
      contentType,
    });

    // await this.fileCacheService.addId(type, id);

    return { type, id, location: 'hot' };
  }
}
