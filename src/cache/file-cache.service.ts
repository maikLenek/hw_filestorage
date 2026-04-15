import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { REDIS_CLIENT } from './file-cache.module';
import Redis from 'ioredis';

export interface FileMeta {
  id: string; // File ID
  type: string; // File type
  location: 'hot' | 'archive'; // Current storage location (was 'status' in some docs)
  createdAt: string; // ISO8601 timestamp of upload (was 'uploadedAt' in some docs)
  contentType?: string; // MIME type (application/pdf, text/plain, etc.)
  size?: number; // File size in bytes (optional)
}

@Injectable()
export class FileCacheService {
  private readonly logger = new Logger(FileCacheService.name);

  // TODO: implement REDIS
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  private metaKey(type: string, id: string): string {
    return `file:${type}:${id}`;
  }

  private listKey(type: string): string {
    return `list:${type}`;
  }

  async getFileMeta(type: string, id: string): Promise<FileMeta | null> {
    const key = this.metaKey(type, id);
    const value: FileMeta | undefined = await this.cacheManager.get(key);

    if (!value) {
      this.logger.debug(`filestorage:cache miss key=${key}`);
    }

    return value ?? null;
  }

  async setFileMeta(type: string, id: string, meta: FileMeta): Promise<void> {
    const key = this.metaKey(type, id);
    await this.cacheManager.set(key, meta, 0);
  }

  async delFileMeta(type: string, id: string): Promise<void> {
    const key = this.metaKey(type, id);
    await this.cacheManager.del(key);
  }

  async addId(type: string, id: string): Promise<void> {
    await this.redis.sadd(this.listKey(type), id);
  }

  async removeId(type: string, id: string): Promise<void> {
    await this.redis.srem(this.listKey(type), id);
  }

  async listsIds(type: string): Promise<string[]> {
    return this.redis.smembers(this.listKey(type));
  }
}
