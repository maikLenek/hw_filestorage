import { Module } from '@nestjs/common';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { FileCacheModule } from '../cache/file-cache.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [FileCacheModule, StorageModule],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
