import { Module } from '@nestjs/common';
import { HotStorageService } from './hot-storage.service';
import { ConfigModule } from '@nestjs/config';
import { ArchiveStorageService } from './archive-storage.service';

@Module({
  imports: [ConfigModule],
  providers: [HotStorageService, ArchiveStorageService],
  exports: [HotStorageService, ArchiveStorageService],
})
export class StorageModule {}
