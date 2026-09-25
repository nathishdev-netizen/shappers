import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { RegisterTenantDto } from './dto/register-tenant.dto.js';
import { LoginDto } from './dto/login.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register-tenant')
  registerTenant(@Body() dto: RegisterTenantDto) {
    return this.authService.registerTenant(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
