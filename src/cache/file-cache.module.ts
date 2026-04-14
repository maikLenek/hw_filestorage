import { Module } from '@nestjs/common';
import { FileCacheService } from './file-cache.service';

@Module({
  providers: [FileCacheService],
  exports: [FileCacheService],
})
export class FileCacheModule {}
