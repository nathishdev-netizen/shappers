import {
  Body, ConflictException, Controller, Get, Injectable, Module, NotFoundException, Param, Patch, Post, UseGuards,
} from '@nestjs/common';
import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { StaffRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import { computeAccessStatus, computeChurnRisk, computeVisitStats } from '../members/member-insights.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser, type AuthenticatedUser } from '../auth/decorators/current-user.decorator.js';

export class CreateStaffDto {
  @IsString() firstName!: string;
  @IsString() lastName!: string;
  @IsEmail() email!: string;
  @IsString() @MinLength(8) password!: string;
  @IsEnum(StaffRole) role!: StaffRole;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() specialty?: string;
  @IsOptional() @IsString() branchId?: string;
}

export class UpdateStaffDto {
  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastName?: string;
  @IsOptional() @IsEnum(StaffRole) role?: StaffRole;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() specialty?: string;
  @IsOptional() @IsString() branchId?: string | null;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  /** Directory with workload: how many clients and upcoming PT sessions each person carries. */
  async list(tenantId: string) {
    const weekAhead = new Date(Date.now() + 7 * 86_400_000);

    const staff = await this.prisma.user.findMany({
      where: { tenantId },
      orderBy: [{ isActive: 'desc' }, { role: 'asc' }, { firstName: 'asc' }],
      select: {
        id: true, firstName: true, lastName: true, email: true, role: true, phone: true,
        specialty: true, isActive: true, createdAt: true,
        branch: { select: { id: true, name: true } },
        _count: { select: { assignedMembers: true, dietPlans: true } },
        ptSessions: {
          where: { scheduledAt: { gte: new Date(), lte: weekAhead }, status: 'SCHEDULED' },
          select: { id: true },
        },
      },
    });

    return staff.map(({ ptSessions, _count, ...s }) => ({
      ...s,
      assignedClients: _count.assignedMembers,
      activeDietPlans: _count.dietPlans,
      sessionsThisWeek: ptSessions.length,
    }));
  }

  /** Everything one staff member is carrying: their clients, sessions and plans. */
  async detail(tenantId: string, id: string) {
    const staff = await this.prisma.user.findFirst({
      where: { id, tenantId },
      select: {
        id: true, firstName: true, lastName: true, email: true, role: true, phone: true,
        specialty: true, isActive: true, createdAt: true,
        branch: { select: { id: true, name: true } },
      },
    });
    if (!staff) throw new NotFoundException('Staff member not found');

    const now = new Date();
    const weekAhead = new Date(now.getTime() + 7 * 86_400_000);

    const [clients, sessions, dietPlans, packages, leads] = await Promise.all([
      this.prisma.member.findMany({
        where: { tenantId, assignedTrainerId: id },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, firstName: true, lastName: true, email: true, phone: true, primaryGoal: true,
          accessBlocked: true,
          branch: { select: { name: true } },
          subscriptions: {
            orderBy: { createdAt: 'desc' }, take: 1,
            include: { membershipPlan: true, freezes: true },
          },
          attendanceEvents: { orderBy: { checkedInAt: 'desc' }, take: 40 },
        },
      }),
      this.prisma.ptSession.findMany({
        where: { trainerId: id, member: { tenantId } },
        orderBy: { scheduledAt: 'desc' },
        take: 60,
        include: { member: { select: { id: true, firstName: true, lastName: true } } },
      }),
      this.prisma.dietPlan.findMany({
        where: { trainerId: id, member: { tenantId } },
        orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
        include: { member: { select: { id: true, firstName: true, lastName: true } } },
      }),
      this.prisma.ptPackage.findMany({
        where: { trainerId: id, member: { tenantId } },
        include: {
          member: { select: { id: true, firstName: true, lastName: true } },
          sessions: { select: { status: true } },
        },
      }),
      this.prisma.lead.count({ where: { tenantId, assignedTrainerId: id, status: { in: ['NEW', 'CONTACTED', 'TRIAL'] } } }),
    ]);

    const upcoming = sessions.filter((s) => s.status === 'SCHEDULED' && s.scheduledAt >= now);

    return {
      ...staff,
      clients: clients.map(({ attendanceEvents, ...m }) => {
        const subscription = m.subscriptions[0] ?? null;
        const visits = computeVisitStats(attendanceEvents);
        const access = computeAccessStatus(subscription, m.accessBlocked);
        return { ...m, access, visits, churnRisk: computeChurnRisk(visits, access) };
      }),
      sessions,
      dietPlans,
      packages: packages.map(({ sessions: ss, ...p }) => {
        const used = ss.filter((s) => s.status === 'COMPLETED').length;
        return { ...p, used, remaining: p.sessionsPurchased - used };
      }),
      stats: {
        clients: clients.length,
        openLeads: leads,
        sessionsUpcoming: upcoming.length,
        sessionsThisWeek: upcoming.filter((s) => s.scheduledAt <= weekAhead).length,
        sessionsCompleted: sessions.filter((s) => s.status === 'COMPLETED').length,
        noShows: sessions.filter((s) => s.status === 'NO_SHOW').length,
        activeDietPlans: dietPlans.filter((d) => d.isActive).length,
      },
    };
  }

  async create(tenantId: string, dto: CreateStaffDto) {
    const exists = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email: dto.email } },
    });
    if (exists) throw new ConflictException('A staff member with that email already exists');

    const { password, ...rest } = dto;
    return this.prisma.user.create({
      data: { tenantId, ...rest, passwordHash: await bcrypt.hash(password, 10) },
      select: { id: true, firstName: true, lastName: true, email: true, role: true },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateStaffDto) {
    const found = await this.prisma.user.findFirst({ where: { id, tenantId } });
    if (!found) throw new NotFoundException('Staff member not found');
    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: { id: true, firstName: true, lastName: true, email: true, role: true, isActive: true },
    });
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('staff')
export class StaffController {
  constructor(private readonly service: StaffService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.service.list(user.tenantId);
  }

  @Get(':id')
  detail(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.detail(user.tenantId, id);
  }

  @Post()
  @Roles(StaffRole.OWNER, StaffRole.ADMIN)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateStaffDto) {
    return this.service.create(user.tenantId, dto);
  }

  @Patch(':id')
  @Roles(StaffRole.OWNER, StaffRole.ADMIN)
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateStaffDto) {
    return this.service.update(user.tenantId, id, dto);
  }
}

@Module({ controllers: [StaffController], providers: [StaffService] })
export class StaffModule {}
