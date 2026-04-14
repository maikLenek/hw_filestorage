import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

export interface FileMeta {
  id: string; // File ID
  type: string; // File type
  location: 'hot' | 'archive'; // Current storage location (was 'status' in some docs)
  createdAt: string; // ISO8601 timestamp of upload (was 'uploadedAt' in some docs)
  contentType: string; // MIME type (application/pdf, text/plain, etc.)
  size?: number; // File size in bytes (optional)
}

@Injectable()
export class FileCacheService {
  private logger = new Logger('filestorage:cache');

  constructor(
    private configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async setValue() {
    await this.cacheManager.set('dupa', 'dupa123');
  }

  async getValue() {
    const val = await this.cacheManager.get('dupa');
    return val;
  }
  //   /**
  //    * Retrieve file metadata from cache (L1 → L2)
  //    * Returns null if not found in either tier.
  //    */
  //   async getFileMeta(type: string, id: string): Promise<FileMeta | null> {
  //     const key = this.buildMetaKey(type, id);
  //     try {
  //       const entry = await this.metadataCache.get(key);
  //       if (entry) {
  //         this.logger.debug(`Cache hit for ${type}/${id}`);
  //       }
  //       return entry || null;
  //     } catch (err) {
  //       this.logger.error(
  //         `Failed to get metadata from cache for ${type}/${id}`,
  //         err.message,
  //       );
  //       return null;
  //     }
  //   }

  //   /**
  //    * Set file metadata in cache (writes to L1 and L2)
  //    */
  //   async setFileMeta(type: string, id: string, entry: FileMeta): Promise<void> {
  //     const key = this.buildMetaKey(type, id);
  //     try {
  //       await this.metadataCache.set(key, entry);
  //       this.logger.debug(`Cache set for ${type}/${id}`);
  //     } catch (err) {
  //       this.logger.error(
  //         `Failed to set metadata in cache for ${type}/${id}`,
  //         err.message,
  //       );
  //       // Non-fatal: continue without cache
  //     }
  //   }

  //   /**
  //    * Delete file metadata from cache
  //    */
  //   async delFileMeta(type: string, id: string): Promise<void> {
  //     const key = this.buildMetaKey(type, id);
  //     try {
  //       await this.metadataCache.delete(key);
  //       this.logger.debug(`Cache delete for ${type}/${id}`);
  //     } catch (err) {
  //       this.logger.error(
  //         `Failed to delete metadata from cache for ${type}/${id}`,
  //         err.message,
  //       );
  //       // Non-fatal
  //     }
  //   }

  //   /**
  //    * Add file ID to the set of file IDs for a type (SADD)
  //    */
  //   async addFileIdToSet(type: string, id: string): Promise<void> {
  //     const setKey = this.buildSetKey(type);
  //     try {
  //       await this.redisClient.sadd(setKey, id);
  //       this.logger.debug(`Added ${id} to set ${setKey}`);
  //     } catch (err) {
  //       this.logger.error(`Failed to add ${id} to set ${setKey}`, err.message);
  //     }
  //   }

  //   /**
  //    * Retrieve all file IDs for a type (SMEMBERS)
  //    */
  //   async getFileIdsByType(type: string): Promise<string[]> {
  //     const setKey = this.buildSetKey(type);
  //     try {
  //       const ids = await this.redisClient.smembers(setKey);
  //       this.logger.debug(`Retrieved ${ids.length} file IDs for type ${type}`);
  //       return ids;
  //     } catch (err) {
  //       this.logger.error(
  //         `Failed to retrieve file IDs for type ${type}`,
  //         err.message,
  //       );
  //       return [];
  //     }
  //   }

  //   /**
  //    * Check if a file ID exists in the set for a type
  //    */
  //   async fileIdExistsInSet(type: string, id: string): Promise<boolean> {
  //     const setKey = this.buildSetKey(type);
  //     try {
  //       const result = await this.redisClient.sismember(setKey, id);
  //       return result === 1;
  //     } catch (err) {
  //       this.logger.error(
  //         `Failed to check if ${id} exists in set ${setKey}`,
  //         err.message,
  //       );
  //       return false;
  //     }
  //   }

  //   /**
  //    * Remove file ID from the set (SREM)
  //    */
  //   async removeFileIdFromSet(type: string, id: string): Promise<void> {
  //     const setKey = this.buildSetKey(type);
  //     try {
  //       await this.redisClient.srem(setKey, id);
  //       this.logger.debug(`Removed ${id} from set ${setKey}`);
  //     } catch (err) {
  //       this.logger.error(
  //         `Failed to remove ${id} from set ${setKey}`,
  //         err.message,
  //       );
  //     }
  //   }

  //   // Private helpers

  //   private buildMetaKey(type: string, id: string): string {
  //     return `${type}:${id}`;
  //   }

  //   private buildSetKey(type: string): string {
  //     return `files:type:${type}`;
  //   }
}
