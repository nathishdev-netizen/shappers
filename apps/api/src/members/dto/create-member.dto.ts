import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Length,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ContactMethod, ExperienceLevel, FitnessGoal, Gender, IdProofType } from '@prisma/client';
import { EnrolMembershipDto } from './enrol-membership.dto.js';

export class CreateMemberDto {
  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsEmail()
  email!: string;

  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() alternatePhone?: string;
  @IsOptional() @IsDateString() dateOfBirth?: string;
  @IsOptional() @IsEnum(Gender) gender?: Gender;
  @IsOptional() @IsString() occupation?: string;
  @IsOptional() @IsEnum(ContactMethod) preferredContact?: ContactMethod;
  @IsOptional() @IsString() photoUrl?: string;

  @IsOptional() @IsString() addressLine?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() postalCode?: string;

  @IsOptional() @IsEnum(IdProofType) idProofType?: IdProofType;
  /** Last four digits only — the full number is never accepted or stored. */
  @IsOptional() @IsString() @Length(4, 4) idProofLast4?: string;
  @IsOptional() @IsString() idProofDocUrl?: string;

  @IsOptional() @IsString() emergencyName?: string;
  @IsOptional() @IsString() emergencyRelationship?: string;
  @IsOptional() @IsString() emergencyPhone?: string;

  @IsOptional() @IsString() medicalConditions?: string;
  @IsOptional() @IsString() allergies?: string;
  @IsOptional() @IsString() medications?: string;
  @IsOptional() @IsString() injuries?: string;
  @IsOptional() @IsBoolean() physicianClearance?: boolean;

  @IsOptional() @IsEnum(FitnessGoal) primaryGoal?: FitnessGoal;
  @IsOptional() @IsEnum(ExperienceLevel) experienceLevel?: ExperienceLevel;
  @IsOptional() @IsNumber() heightCm?: number;

  @IsOptional() @IsString() assignedTrainerId?: string;
  @IsOptional() @IsString() accessCardNumber?: string;
  @IsOptional() @IsString() notes?: string;

  @IsOptional() @IsBoolean() parqCompleted?: boolean;
  @IsOptional() @IsBoolean() waiverSigned?: boolean;

  /** Plan, duration and the money taken at the counter. */
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => EnrolMembershipDto)
  membership?: EnrolMembershipDto;
}
