import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ItemBucketMetadata } from 'minio';
import { Client, ClientOptions } from 'minio';
import { Readable } from 'stream';

@Injectable()
export class ArchiveStorageService implements OnModuleInit {
  private readonly logger = new Logger(ArchiveStorageService.name);
  private client: Client;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    const minioParams: ClientOptions = {
      endPoint: this.configService.get<string>('app.minio.endpoint') ?? '',
      port: this.configService.get<number>('app.minio.port') ?? 9000,
      useSSL: this.configService.get<boolean>('app.minio.useSsl') ?? false,
      accessKey: this.configService.get<string>('app.minio.accessKey') ?? '',
      secretKey: this.configService.get<string>('app.minio.secretKey') ?? '',
    };
    this.client = new Client(minioParams);

    this.bucket =
      this.configService.get<string>('app.minio.archiveBucket') ??
      'filestorage-archive';
  }

  async onModuleInit(): Promise<void> {
    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        await this.client.makeBucket(this.bucket);
        this.logger.log(
          `filestorage:archive-storage bucket-created bucket=${this.bucket}`,
        );
      } else {
        this.logger.log(
          `filestorage:archive-storage bucket-exists bucket=${this.bucket}`,
        );
      }
    } catch (err) {
      this.logger.error(
        `filestorage:archive-storage bucket-init-error bucket=${this.bucket}`,
        (err as Error).stack,
      );
      throw err;
    }
  }

  private objectKey(type: string, id: string): string {
    return `${type}/${id}`;
  }

  private isNoSuchKey(err: unknown): boolean {
    return (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: string }).code === 'NoSuchKey'
    );
  }

  async put(
    type: string,
    id: string,
    data: Readable | Buffer,
    contentLength: number,
    contentType: string,
  ): Promise<void> {
    const key = this.objectKey(type, id);
    const stream = data instanceof Buffer ? Readable.from(data) : data;

    const metadata: ItemBucketMetadata = { 'Content-Type': contentType };

    this.logger.log(
      `filestorage:archive-storage put key=${key} size=${contentLength}`,
    );

    try {
      await this.client.putObject(
        this.bucket,
        key,
        stream,
        contentLength,
        metadata,
      );
    } catch (err) {
      this.logger.error(
        `filestorage:archive-storage put-error key=${key} code=${err.code}`,
        (err as Error).stack,
      );
      throw err;
    }
  }

  async get(type: string, id: string): Promise<Readable> {
    const key = this.objectKey(type, id);

    this.logger.log(`filestorage:archive-storage get key=${key}`);

    try {
      return await this.client.getObject(this.bucket, key);
    } catch (err) {
      if (this.isNoSuchKey(err)) {
        throw new NotFoundException(
          `Archive object not found: type=${type} id=${id}`,
        );
      }
      this.logger.error(
        `filestorage:archive-storage get-error key=${key} code=${err.code}`,
        (err as Error).stack,
      );
      throw err;
    }
  }

  async delete(type: string, id: string): Promise<void> {
    const key = this.objectKey(type, id);

    this.logger.log(`filestorage:archive-storage delete key=${key}`);

    try {
      await this.client.removeObject(this.bucket, key);
    } catch (err) {
      if (!this.isNoSuchKey(err)) {
        this.logger.error(
          `filestorage:archive-storage delete-error key=${key} code=${err.code}`,
          (err as Error).stack,
        );
        throw err;
      }
    }
  }
}
