import { IsHexColor, IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateBrandingDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  logoUrl?: string;

  @IsOptional()
  @IsHexColor()
  primaryColor?: string;

  @IsOptional()
  @IsHexColor()
  secondaryColor?: string;
}
