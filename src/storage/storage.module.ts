import { Module } from '@nestjs/common';
import { HotStorageService } from './hot-storage.service';

@Module({
  providers: [HotStorageService],
  exports: [HotStorageService],
})
export class StorageModule {}
