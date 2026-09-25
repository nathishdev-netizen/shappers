import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { BillingCycle } from '@prisma/client';

export class CreatePlanDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(0)
  priceCents!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsEnum(BillingCycle)
  billingCycle!: BillingCycle;
}
