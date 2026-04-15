import { IsArray, IsString, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { Transform } from 'class-transformer';

export class ExistsQueryDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one id must be provided' })
  @ArrayMaxSize(1000, { message: 'Maximum 1000 ids per request' })
  @IsString({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  ids: string[];
}
