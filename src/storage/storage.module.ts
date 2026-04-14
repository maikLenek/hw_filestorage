import { Module } from '@nestjs/common';
import { HotStorageService } from './hot-storage.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [HotStorageService],
  exports: [HotStorageService],
})
export class StorageModule {}
