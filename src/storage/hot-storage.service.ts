import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import { Readable } from 'stream';
import { FILE_IDENT_REGEX } from './storage.constants';

@Injectable()
export class HotStorageService {
  private readonly logger = new Logger(HotStorageService.name);
  private readonly hotStoragePath: string;

  constructor(private configService: ConfigService) {
    this.hotStoragePath =
      configService.get<string>('app.hotStorage.path') || '/hot-storage';
    this.logger.log(`Hot Storage path ${this.hotStoragePath}`);
  }

  private sanitizePath(name: string): string {
    if (!name) {
      throw new BadRequestException('Invalid path: must be non-empty');
    }
    const trimmed = name.trim();

    if (!FILE_IDENT_REGEX.test(trimmed)) {
      throw new BadRequestException(`Invalid identifier: ${name}`);
    }

    if (
      trimmed.includes('..') ||
      trimmed.includes('/') ||
      trimmed.includes('\\')
    ) {
      throw new BadRequestException('Path traversal detected in identifier');
    }

    if (trimmed.includes('\0')) {
      throw new BadRequestException('Null byte in identifier');
    }

    return trimmed;
  }

  private buildFilePath(type: string, id: string): string {
    const sanitizedType = this.sanitizePath(type);
    const sanitizedId = this.sanitizePath(id);

    // Create sharding directory from first 2 characters of ID
    const shard = sanitizedId.slice(0, 2);

    const filePath = path.join(
      this.hotStoragePath,
      sanitizedType,
      shard,
      sanitizedId,
    );

    // Verify the path stays within hotStoragePath (no escapes)
    const realPath = path.resolve(filePath);
    const basePath = path.resolve(this.hotStoragePath);

    if (!realPath.startsWith(basePath)) {
      throw new BadRequestException(
        'Invalid path: attempt to escape hot storage directory',
      );
    }

    return filePath;
  }

  private buildTmpPath(type: string, id: string): string {
    return `${this.buildFilePath(type, id)}.tmp`;
  }

  write(
    type: string,
    id: string,
    data: Buffer | Readable,
    contentLength: number,
  ): void {
    const filePath = this.buildFilePath(type, id);

    this.logger.log(
      `filestorage:hot-storage write type=${type} id=${id} size=${contentLength}`,
    );

    try {
      // Check if file already exists
      const exists = this.exists(type, id);
      if (exists) {
        this.logger.warn(
          `filestorage:hot-storage conflict type=${type} id=${id}`,
        );
        throw new ConflictException(
          `File already exists: type=${type}, id=${id}`,
        );
      }

      // Create directory structure (mkdir -p equivalent)
      const directory = path.dirname(filePath);
      fsSync.mkdirSync(directory, { recursive: true });

      // Write to temporary file first (atomic write pattern)
      const tempPath = this.buildTmpPath(type, id);

      if (data instanceof Readable) {
        const stream = fsSync.createWriteStream(tempPath);
        data.pipe(stream);
      } else {
        fsSync.writeFileSync(tempPath, data);
      }

      // Atomic rename: move temp → final path
      fsSync.renameSync(tempPath, filePath);

      this.logger.debug(
        `filestorage:hot-storage write-complete type=${type} id=${id}`,
      );
    } catch (error) {
      fsSync.unlinkSync(filePath);
      if (error instanceof ConflictException) {
        throw error;
      }
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(
        `filestorage:hot-storage write-error type=${type} id=${id}`,
        error instanceof Error ? error.message : String(error),
      );

      throw new InternalServerErrorException(
        `Failed to write file: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }

  // TODO: convert to synch
  async read(type: string, id: string): Promise<StreamableFile> {
    const filePath = this.buildFilePath(type, id);

    this.logger.log(`filestorage:hot-storage read type=${type} id=${id}`);

    try {
      // Check if file exists before opening
      const fileExists = this.exists(type, id);
      if (!fileExists) {
        this.logger.warn(
          `filestorage:hot-storage read-not-found type=${type} id=${id}`,
        );
        throw new NotFoundException(`File not found: type=${type}, id=${id}`);
      }

      // Get file stats for Content-Length header
      const stats = await fs.stat(filePath);

      // Create read stream
      const readStream = fsSync.createReadStream(filePath, {
        highWaterMark: 64 * 1024, // 64 KB buffer
      });

      this.logger.debug(
        `filestorage:hot-storage read-stream-created type=${type} id=${id}`,
      );

      return new StreamableFile(readStream, {
        length: stats.size,
        type: 'application/octet-stream', // Default; caller can override
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(
        `filestorage:hot-storage read-error type=${type} id=${id}`,
        error instanceof Error ? error.message : String(error),
      );

      throw new InternalServerErrorException(
        `Failed to read file: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }

  // TODO: convert to synch
  async delete(type: string, id: string): Promise<void> {
    const filePath = this.buildFilePath(type, id);

    this.logger.log(`filestorage:hot-storage delete type=${type} id=${id}`);

    try {
      await fs.unlink(filePath).catch((err) => {
        if (err instanceof Error && 'code' in err && err.code !== 'ENOENT') {
          throw err;
        }
        // Silently ignore "file not found"
      });

      this.logger.debug(
        `filestorage:hot-storage delete-complete type=${type} id=${id}`,
      );
    } catch (error) {
      this.logger.error(
        `filestorage:hot-storage delete-error type=${type} id=${id}`,
        error instanceof Error ? error.message : String(error),
      );

      throw new InternalServerErrorException(
        `Failed to delete file: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }

  exists(type: string, id: string): boolean {
    const filePath = this.buildFilePath(type, id);

    try {
      fsSync.accessSync(filePath, fsSync.constants.F_OK);
      return true;
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        return false;
      }

      this.logger.warn(
        `filestorage:hot-storage exists-error type=${type} id=${id}`,
        error instanceof Error ? error.message : String(error),
      );
      return false;
    }
  }
}
