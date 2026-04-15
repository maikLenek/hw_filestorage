import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Param,
  BadRequestException,
  HttpCode,
  Get,
  HttpStatus,
  Query,
  Delete,
  StreamableFile,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { FilesService } from './files.service';
import { memoryStorage } from 'multer';
import { UploadFileResponseDto } from './dto/upload-file.dto';
import { FileParamPipe } from './pipes/file-param.pipe';
import { ListFilesResponseDto } from './dto/list-files.dto';
import { ExistsQueryDto } from './dto/exists-query.dto';
import { ExistsResponseDto } from './dto/exists-result.dto';
import type { Response } from 'express';

@Controller({ path: 'files', version: '1' })
export class FilesController {
  private readonly maxFileSize: number;
  constructor(
    private filesService: FilesService,
    private configService: ConfigService,
  ) {
    this.maxFileSize =
      this.configService.get('app.upload.maxSizeBytes') ?? 104857600;
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

  @Get(':type/:id')
  async download(
    @Param('type', FileParamPipe) type: string,
    @Param('id', FileParamPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { file, contentType } = await this.filesService.download(type, id);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${id}"`);

    if (file instanceof StreamableFile) {
      return file;
    }

    return new StreamableFile(file);
  }

  @Get(':type')
  async list(
    @Param('type', FileParamPipe) type: string,
  ): Promise<ListFilesResponseDto> {
    return this.filesService.list(type);
  }

  @Get(':type/exists')
  async exists(
    @Param('type', FileParamPipe) type: string,
    @Query() query: ExistsQueryDto,
  ): Promise<ExistsResponseDto> {
    return this.filesService.batchExists(type, query.ids);
  }

  @Delete(':type/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('type', FileParamPipe) type: string,
    @Param('id', FileParamPipe) id: string,
  ): Promise<void> {
    await this.filesService.delete(type, id);
  }
}
