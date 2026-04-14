import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Param,
  BadRequestException,
  ConflictException,
  PayloadTooLargeException,
  InternalServerErrorException,
  HttpCode,
  Get,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { FilesService } from './files.service';
import { memoryStorage } from 'multer';
import { FileMeta } from '../cache/file-cache.service';
import { UploadFileResponseDto } from './dto/upload-file.dto';
import { FileParamPipe } from './pipes/file-param.pipe';

@Controller({ path: 'files', version: '1' })
export class FilesController {
  private readonly maxFileSize: number;
  constructor(
    private filesService: FilesService,
    private configService: ConfigService,
  ) {
    this.maxFileSize =
      this.configService.get('app.upload.maxSizeBytes') | 104857600;
  }

  @Post(':type/:id')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 104_857_600 },
    }),
  )
  async upload(
    @Param('type', FileParamPipe) type: string,
    @Param('id', FileParamPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadFileResponseDto> {
    if (!file) {
      throw new BadRequestException('Missing file field in multipart body');
    }
    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File size ${file.size} exceeds limit of ${this.maxFileSize} bytes`,
      );
    }

    return this.filesService.upload(
      type,
      id,
      file.buffer,
      file.mimetype ?? 'application/octet-stream',
    );
  }
}
