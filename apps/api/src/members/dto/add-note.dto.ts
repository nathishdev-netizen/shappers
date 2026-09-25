import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class AddNoteDto {
  @IsString()
  @MinLength(1)
  body!: string;

  @IsOptional()
  @IsBoolean()
  pinned?: boolean;
}
