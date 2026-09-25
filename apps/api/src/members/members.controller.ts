import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { StaffRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser, type AuthenticatedUser } from '../auth/decorators/current-user.decorator.js';
import { MembersService } from './members.service.js';
import { CreateMemberDto } from './dto/create-member.dto.js';
import { UpdateMemberDto } from './dto/update-member.dto.js';
import { AddNoteDto } from './dto/add-note.dto.js';
import { AddMeasurementDto } from './dto/add-measurement.dto.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Post()
  @Roles(StaffRole.OWNER, StaffRole.ADMIN, StaffRole.STAFF)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateMemberDto) {
    return this.membersService.create(user.tenantId, dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.membersService.findAll(user.tenantId);
  }

  @Get('dues/overview')
  @Roles(StaffRole.OWNER, StaffRole.ADMIN)
  duesOverview(@CurrentUser() user: AuthenticatedUser) {
    return this.membersService.duesOverview(user.tenantId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.membersService.findOne(user.tenantId, id);
  }

  @Patch(':id')
  @Roles(StaffRole.OWNER, StaffRole.ADMIN, StaffRole.STAFF)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.membersService.update(user.tenantId, id, dto);
  }

  @Post(':id/notes')
  addNote(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AddNoteDto,
  ) {
    return this.membersService.addNote(user.tenantId, id, user.userId, dto);
  }

  @Post(':id/measurements')
  addMeasurement(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AddMeasurementDto,
  ) {
    return this.membersService.addMeasurement(user.tenantId, id, dto);
  }
}
