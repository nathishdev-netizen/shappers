import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { StaffRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser, type AuthenticatedUser } from '../auth/decorators/current-user.decorator.js';
import { MembershipPlansService } from './membership-plans.service.js';
import { CreatePlanDto } from './dto/create-plan.dto.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('membership-plans')
export class MembershipPlansController {
  constructor(private readonly plansService: MembershipPlansService) {}

  @Post()
  @Roles(StaffRole.OWNER, StaffRole.ADMIN)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreatePlanDto) {
    return this.plansService.create(user.tenantId, dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.plansService.findAll(user.tenantId);
  }
}
