import { Body, Controller, Get, Injectable, Module, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { StaffRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser, type AuthenticatedUser } from '../auth/decorators/current-user.decorator.js';

export class UpsertBranchDto {
  @IsString() name!: string;
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() addressLine?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() openingHours?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Each branch carries live counts so the branches screen reads as a network overview. */
  async list(tenantId: string) {
    const branches = await this.prisma.branch.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
      include: {
        _count: { select: { members: true, users: true, classes: true, leads: true } },
      },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return Promise.all(
      branches.map(async (b) => {
        const checkInsToday = await this.prisma.attendanceEvent.count({
          where: { tenantId, member: { branchId: b.id }, checkedInAt: { gte: today } },
        });
        return { ...b, checkInsToday };
      }),
    );
  }

  create(tenantId: string, dto: UpsertBranchDto) {
    return this.prisma.branch.create({ data: { tenantId, ...dto } });
  }

  async update(tenantId: string, id: string, dto: Partial<UpsertBranchDto>) {
    await this.prisma.branch.findFirstOrThrow({ where: { id, tenantId } });
    return this.prisma.branch.update({ where: { id }, data: dto });
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('branches')
export class BranchesController {
  constructor(private readonly service: BranchesService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.service.list(user.tenantId);
  }

  @Post()
  @Roles(StaffRole.OWNER, StaffRole.ADMIN)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpsertBranchDto) {
    return this.service.create(user.tenantId, dto);
  }

  @Patch(':id')
  @Roles(StaffRole.OWNER, StaffRole.ADMIN)
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: Partial<UpsertBranchDto>) {
    return this.service.update(user.tenantId, id, dto);
  }
}

@Module({ controllers: [BranchesController], providers: [BranchesService] })
export class BranchesModule {}
