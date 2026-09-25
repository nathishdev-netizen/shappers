import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { StaffRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser, type AuthenticatedUser } from '../auth/decorators/current-user.decorator.js';
import { TenantsService } from './tenants.service.js';
import { UpdateBrandingDto } from './dto/update-branding.dto.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tenants/me')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  getMyTenant(@CurrentUser() user: AuthenticatedUser) {
    return this.tenantsService.findById(user.tenantId);
  }

  @Get('staff')
  listStaff(@CurrentUser() user: AuthenticatedUser) {
    return this.tenantsService.listStaff(user.tenantId);
  }

  @Patch('branding')
  @Roles(StaffRole.OWNER, StaffRole.ADMIN)
  updateBranding(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateBrandingDto) {
    return this.tenantsService.updateBranding(user.tenantId, dto);
  }
}
