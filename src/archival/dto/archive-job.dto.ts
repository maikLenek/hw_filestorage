import { IsString, IsDateString } from 'class-validator';

export class ArchiveJobDto {
  @IsString()
  type: string;

  @IsString()
  id: string;

  @IsDateString()
  createdAt: string;
}
