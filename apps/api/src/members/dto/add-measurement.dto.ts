import { IsNumber, IsOptional, IsString } from 'class-validator';

export class AddMeasurementDto {
  @IsOptional() @IsNumber() weightKg?: number;
  @IsOptional() @IsNumber() bodyFatPercent?: number;
  @IsOptional() @IsNumber() chestCm?: number;
  @IsOptional() @IsNumber() waistCm?: number;
  @IsOptional() @IsNumber() hipsCm?: number;
  @IsOptional() @IsNumber() armCm?: number;
  @IsOptional() @IsNumber() thighCm?: number;
  @IsOptional() @IsString() notes?: string;
}
