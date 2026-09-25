import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterTenantDto {
  @IsString()
  @MinLength(2)
  gymName!: string;

  @IsString()
  @MinLength(2)
  subdomain!: string;

  @IsEmail()
  ownerEmail!: string;

  @IsString()
  @MinLength(8)
  ownerPassword!: string;

  @IsString()
  ownerFirstName!: string;

  @IsString()
  ownerLastName!: string;
}
