import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';

const SAFE_SEGMENT = /^[a-zA-Z0-9_-]{1,128}$/;

@Injectable()
export class FileParamPipe implements PipeTransform<string, string> {
  transform(value: string, metadata: ArgumentMetadata): string {
    if (!SAFE_SEGMENT.test(value)) {
      throw new BadRequestException(
        `Invalid ${metadata.data}: must match ^[a-zA-Z0-9_-]{1,128}$`,
      );
    }
    return value;
  }
}
