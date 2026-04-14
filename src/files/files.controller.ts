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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { FilesService } from './files.service';
import { FileMeta } from '../cache/file-cache.service';

@Controller({ path: 'files', version: '1' })
export class FilesController {
  constructor(
    private filesService: FilesService,
    private configService: ConfigService,
  ) {}

  @Get()
  async dupa() {
    console.log('sosrormo');
    await this.filesService.uploadFileTest();
  }

  /**
   * Validate type and id against allowlist
   * Allowed: alphanumeric, hyphen, underscore (1-128 chars)
   */
  private validateTypeAndId(type: string, id: string): void {
    const allowlist = /^[a-zA-Z0-9_-]{1,128}$/;

    if (!allowlist.test(type)) {
      throw new BadRequestException(`Invalid type: must match ${allowlist}`);
    }

    if (!allowlist.test(id)) {
      throw new BadRequestException(`Invalid id: must match ${allowlist}`);
    }
  }
}
