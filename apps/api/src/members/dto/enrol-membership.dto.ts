import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

/** What the front desk agrees with the member at the counter. */
export class EnrolMembershipDto {
  @IsString()
  membershipPlanId!: string;

  /** Defaults to today — lets staff post-date a membership that starts next month. */
  @IsOptional()
  @IsDateString()
  startDate?: string;

  /** Defaults to the plan's billing cycle. Explicit so staff can sell odd durations. */
  @IsOptional()
  @IsInt()
  @Min(1)
  durationDays?: number;

  /** Defaults to the plan price. Overridable so a negotiated discount is recorded. */
  @IsOptional()
  @IsInt()
  @Min(0)
  totalFeeCents?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  amountPaidCents?: number;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  /** When the unpaid remainder falls due. */
  @IsOptional()
  @IsDateString()
  balanceDueAt?: string;
}
