import { IsEnum, IsString } from 'class-validator';
import { AttendanceSource } from '@prisma/client';

export class CheckInDto {
  @IsString()
  memberId!: string;

  @IsEnum(AttendanceSource)
  source!: AttendanceSource;
}
