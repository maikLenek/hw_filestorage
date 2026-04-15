import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { FileCacheService } from '../cache/file-cache.service';
import { HotStorageService } from '../storage/hot-storage.service';
import { UploadFileResponseDto } from './dto/upload-file.dto';
import { Readable } from 'stream';
import { ArchiveStorageService } from 'src/storage/archive-storage.service';

@Injectable()
export class FilesService {
  private logger = new Logger(FilesService.name);

  constructor(
    private fileCacheService: FileCacheService,
    private hotStorageService: HotStorageService,
    private archiveStorageService: ArchiveStorageService,
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
      size: buffer.length,
    });

    await this.fileCacheService.addId(type, id);

    return { type, id, location: 'hot' };
  }

  async download(
    type: string,
    id: string,
  ): Promise<{ file: StreamableFile | Readable; contentType: string }> {
    const meta = await this.fileCacheService.getFileMeta(type, id);

    if (!meta) {
      throw new NotFoundException(`File not found: type=${type} id=${id}`);
    }

    this.logger.log(
      `filestorage:download type=${type} id=${id} location=${meta.location}`,
    );

    // Checing in hot -> disk storage
    if (meta.location === 'hot') {
      try {
        const hotFile = await this.hotStorageService.read(type, id);
        return { file: hotFile, contentType: meta.contentType };
      } catch (err) {
        if (err instanceof NotFoundException) {
          this.logger.warn(
            `filestorage:download cache-stale type=${type} id=${id}`,
          );
          throw new NotFoundException(
            `File not found on disk (stale cache): type=${type} id=${id}`,
          );
        }
        throw err;
      }
    }

    try {
      const readable = await this.archiveStorageService.get(type, id);
      return { file: readable, contentType: meta.contentType };
    } catch (err) {
      if (err instanceof NotFoundException) {
        this.logger.warn(
          `filestorage:download archive-stale type=${type} id=${id}`,
        );
        throw new NotFoundException(
          `File not found in archive (stale cache): type=${type} id=${id}`,
        );
      }
      throw err;
    }
  }

  async delete(type: string, id: string): Promise<void> {
    const meta = await this.fileCacheService.getFileMeta(type, id);

    if (!meta) {
      throw new NotFoundException(`File not found: type=${type} id=${id}`);
    }

    if (meta.location === 'hot') {
      await this.hotStorageService.delete(type, id);
    }

    await this.fileCacheService.delFileMeta(type, id);
    await this.fileCacheService.removeId(type, id);
  }

  async list(type: string): Promise<{ type: string; ids: string[] }> {
    const ids = await this.fileCacheService.listsIds(type);
    return { type, ids };
  }

  async batchExists(
    type: string,
    ids: string[],
  ): Promise<{
    type: string;
    results: Array<{
      id: string;
      exists: boolean;
      location: 'hot' | 'archive' | null;
    }>;
  }> {
    const metaList = await Promise.all(
      ids.map((id) => this.fileCacheService.getFileMeta(type, id)),
    );
    const results = ids.map((id, index) => {
      const meta = metaList[index];
      return {
        id,
        exists: meta !== null,
        location: meta?.location ?? null,
      };
    });

    const found = results.filter((r) => r.exists).length;
    this.logger.log(
      `filestorage:exists type=${type} requested=${ids.length} found=${found}`,
    );
    return { type, results };
  }
}
