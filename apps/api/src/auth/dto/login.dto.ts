import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @IsString()
  subdomain!: string;

  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}
