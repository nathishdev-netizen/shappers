import {
  Body, Controller, Get, Injectable, Module, NotFoundException, Param, Patch, Post, UseGuards,
} from '@nestjs/common';
import { IsArray, IsBoolean, IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { DietGoal } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser, type AuthenticatedUser } from '../auth/decorators/current-user.decorator.js';

export interface Meal {
  time: string;
  name: string;
  items: string[];
  calories?: number;
}

export class CreateDietPlanDto {
  @IsString() memberId!: string;
  @IsOptional() @IsString() trainerId?: string;
  @IsString() title!: string;
  @IsOptional() @IsEnum(DietGoal) goal?: DietGoal;
  @IsOptional() @IsInt() @Min(0) dailyCalories?: number;
  @IsOptional() @IsInt() @Min(0) proteinG?: number;
  @IsOptional() @IsInt() @Min(0) carbsG?: number;
  @IsOptional() @IsInt() @Min(0) fatG?: number;
  @IsArray() meals!: Meal[];
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
}

export class UpdateDietPlanDto {
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsArray() meals?: Meal[];
}

@Injectable()
export class DietService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.dietPlan.findMany({
      where: { member: { tenantId } },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
      include: {
        member: { select: { id: true, firstName: true, lastName: true, primaryGoal: true } },
        trainer: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  forMember(tenantId: string, memberId: string) {
    return this.prisma.dietPlan.findMany({
      where: { memberId, member: { tenantId } },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
      include: { trainer: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async create(tenantId: string, dto: CreateDietPlanDto) {
    const member = await this.prisma.member.findFirst({ where: { id: dto.memberId, tenantId } });
    if (!member) throw new NotFoundException('Member not found');

    // One active plan per member keeps "what should they eat today" unambiguous.
    await this.prisma.dietPlan.updateMany({
      where: { memberId: dto.memberId, isActive: true },
      data: { isActive: false },
    });

    return this.prisma.dietPlan.create({
      data: {
        ...dto,
        meals: dto.meals as object[],
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateDietPlanDto) {
    const found = await this.prisma.dietPlan.findFirst({ where: { id, member: { tenantId } } });
    if (!found) throw new NotFoundException('Diet plan not found');
    return this.prisma.dietPlan.update({
      where: { id },
      data: { ...dto, meals: dto.meals ? (dto.meals as object[]) : undefined },
    });
  }
}

@UseGuards(JwtAuthGuard)
@Controller('diet-plans')
export class DietController {
  constructor(private readonly service: DietService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.service.list(user.tenantId);
  }

  @Get('member/:memberId')
  forMember(@CurrentUser() user: AuthenticatedUser, @Param('memberId') memberId: string) {
    return this.service.forMember(user.tenantId, memberId);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateDietPlanDto) {
    return this.service.create(user.tenantId, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateDietPlanDto) {
    return this.service.update(user.tenantId, id, dto);
  }
}

@Module({ controllers: [DietController], providers: [DietService] })
export class DietModule {}
