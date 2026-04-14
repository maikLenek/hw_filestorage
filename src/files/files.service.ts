import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileCacheService } from '../cache/file-cache.service';
import { HotStorageService } from '../storage/hot-storage.service';
import { FileMeta } from '../cache/file-cache.service';

@Injectable()
export class FilesService {
  private logger = new Logger('filestorage:files');

  constructor(
    private configService: ConfigService,
    private cacheService: FileCacheService,
    private hotStorageService: HotStorageService,
  ) {}

  async uploadFileTest(): Promise<void> {
    await this.cacheService.setValue();
    const v = await this.cacheService.getValue();
    console.log(v);
  }
}
