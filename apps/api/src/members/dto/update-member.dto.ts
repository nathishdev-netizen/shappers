import { OmitType, PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateMemberDto } from './create-member.dto.js';

/** Enrolment is a subscription action, not a profile edit, so it is excluded here. */
export class UpdateMemberDto extends PartialType(
  OmitType(CreateMemberDto, ['membership', 'parqCompleted', 'waiverSigned'] as const),
) {
  @IsOptional()
  @IsBoolean()
  accessBlocked?: boolean;
}
