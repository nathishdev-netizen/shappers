import {
  Body, Controller, Get, Injectable, Module, NotFoundException, Param, Patch, Post, UseGuards,
} from '@nestjs/common';
import { IsDateString, IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { LeadSource, LeadStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser, type AuthenticatedUser } from '../auth/decorators/current-user.decorator.js';

export class CreateLeadDto {
  @IsString() firstName!: string;
  @IsString() lastName!: string;
  @IsString() phone!: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsEnum(LeadSource) source?: LeadSource;
  @IsOptional() @IsString() interestedPlanId?: string;
  @IsOptional() @IsString() assignedTrainerId?: string;
  @IsOptional() @IsString() branchId?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsDateString() followUpAt?: string;
}

export class UpdateLeadDto {
  @IsOptional() @IsEnum(LeadStatus) status?: LeadStatus;
  @IsOptional() @IsString() assignedTrainerId?: string | null;
  @IsOptional() @IsString() interestedPlanId?: string | null;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsDateString() followUpAt?: string | null;
}

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly include = {
    interestedPlan: { select: { id: true, name: true, priceCents: true } },
    assignedTrainer: { select: { id: true, firstName: true, lastName: true } },
    branch: { select: { id: true, name: true } },
  };

  async list(tenantId: string) {
    const leads = await this.prisma.lead.findMany({
      where: { tenantId },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      include: this.include,
    });

    const funnel = Object.values(LeadStatus).map((status) => ({
      status,
      count: leads.filter((l) => l.status === status).length,
    }));

    return { leads, funnel };
  }

  create(tenantId: string, dto: CreateLeadDto) {
    return this.prisma.lead.create({
      data: { tenantId, ...dto, followUpAt: dto.followUpAt ? new Date(dto.followUpAt) : undefined },
      include: this.include,
    });
  }

  async update(tenantId: string, id: string, dto: UpdateLeadDto) {
    const found = await this.prisma.lead.findFirst({ where: { id, tenantId } });
    if (!found) throw new NotFoundException('Lead not found');
    return this.prisma.lead.update({
      where: { id },
      data: {
        ...dto,
        followUpAt: dto.followUpAt === undefined ? undefined : dto.followUpAt ? new Date(dto.followUpAt) : null,
      },
      include: this.include,
    });
  }
}

@UseGuards(JwtAuthGuard)
@Controller('leads')
export class LeadsController {
  constructor(private readonly service: LeadsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.service.list(user.tenantId);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateLeadDto) {
    return this.service.create(user.tenantId, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateLeadDto) {
    return this.service.update(user.tenantId, id, dto);
  }
}

@Module({ controllers: [LeadsController], providers: [LeadsService] })
export class LeadsModule {}
