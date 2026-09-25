import {
  BadRequestException, Body, Controller, Get, Injectable, Module, NotFoundException, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PtSessionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser, type AuthenticatedUser } from '../auth/decorators/current-user.decorator.js';

export class CreatePackageDto {
  @IsString() memberId!: string;
  @IsOptional() @IsString() trainerId?: string;
  @IsInt() @Min(1) sessionsPurchased!: number;
  @IsInt() @Min(0) priceCents!: number;
  @IsOptional() @IsDateString() expiresAt?: string;
}

export class ScheduleSessionDto {
  @IsString() packageId!: string;
  @IsDateString() scheduledAt!: string;
  @IsOptional() @IsInt() @Min(15) durationMinutes?: number;
  @IsOptional() @IsString() trainerId?: string;
  @IsOptional() @IsString() focus?: string;
}

export class UpdateSessionDto {
  @IsOptional() @IsEnum(PtSessionStatus) status?: PtSessionStatus;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsDateString() scheduledAt?: string;
}

@Injectable()
export class PtService {
  constructor(private readonly prisma: PrismaService) {}

  /** Trainer-facing agenda: every session in a window, optionally for one trainer. */
  async sessions(tenantId: string, from: Date, to: Date, trainerId?: string) {
    return this.prisma.ptSession.findMany({
      where: {
        member: { tenantId },
        scheduledAt: { gte: from, lte: to },
        ...(trainerId ? { trainerId } : {}),
      },
      orderBy: { scheduledAt: 'asc' },
      include: {
        member: { select: { id: true, firstName: true, lastName: true } },
        trainer: { select: { id: true, firstName: true, lastName: true } },
        package: { select: { id: true, sessionsPurchased: true } },
      },
    });
  }

  /** Packages with remaining balance so staff see who is running out. */
  async packages(tenantId: string) {
    const packages = await this.prisma.ptPackage.findMany({
      where: { member: { tenantId } },
      orderBy: { purchasedAt: 'desc' },
      include: {
        member: { select: { id: true, firstName: true, lastName: true } },
        trainer: { select: { id: true, firstName: true, lastName: true } },
        sessions: { select: { status: true } },
      },
    });

    return packages.map(({ sessions, ...p }) => {
      const used = sessions.filter((s) => s.status === PtSessionStatus.COMPLETED).length;
      const scheduled = sessions.filter((s) => s.status === PtSessionStatus.SCHEDULED).length;
      return { ...p, used, scheduled, remaining: p.sessionsPurchased - used };
    });
  }

  async createPackage(tenantId: string, dto: CreatePackageDto) {
    const member = await this.prisma.member.findFirst({ where: { id: dto.memberId, tenantId } });
    if (!member) throw new NotFoundException('Member not found');
    return this.prisma.ptPackage.create({
      data: { ...dto, expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined },
    });
  }

  async schedule(tenantId: string, dto: ScheduleSessionDto) {
    const pkg = await this.prisma.ptPackage.findFirst({
      where: { id: dto.packageId, member: { tenantId } },
      include: { sessions: { select: { status: true } } },
    });
    if (!pkg) throw new NotFoundException('PT package not found');

    const consumed = pkg.sessions.filter((s) => s.status !== PtSessionStatus.CANCELLED).length;
    if (consumed >= pkg.sessionsPurchased) {
      throw new BadRequestException('This package has no sessions left');
    }

    return this.prisma.ptSession.create({
      data: {
        packageId: pkg.id,
        memberId: pkg.memberId,
        trainerId: dto.trainerId ?? pkg.trainerId,
        scheduledAt: new Date(dto.scheduledAt),
        durationMinutes: dto.durationMinutes ?? 60,
        focus: dto.focus,
      },
    });
  }

  async updateSession(tenantId: string, id: string, dto: UpdateSessionDto) {
    const found = await this.prisma.ptSession.findFirst({ where: { id, member: { tenantId } } });
    if (!found) throw new NotFoundException('Session not found');
    return this.prisma.ptSession.update({
      where: { id },
      data: {
        ...dto,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        completedAt: dto.status === PtSessionStatus.COMPLETED ? new Date() : undefined,
      },
    });
  }
}

@UseGuards(JwtAuthGuard)
@Controller('pt')
export class PtController {
  constructor(private readonly service: PtService) {}

  @Get('sessions')
  sessions(
    @CurrentUser() user: AuthenticatedUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('trainerId') trainerId?: string,
  ) {
    const start = from ? new Date(from) : new Date(Date.now() - 86_400_000);
    const end = to ? new Date(to) : new Date(Date.now() + 14 * 86_400_000);
    return this.service.sessions(user.tenantId, start, end, trainerId);
  }

  @Get('packages')
  packages(@CurrentUser() user: AuthenticatedUser) {
    return this.service.packages(user.tenantId);
  }

  @Post('packages')
  createPackage(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreatePackageDto) {
    return this.service.createPackage(user.tenantId, dto);
  }

  @Post('sessions')
  schedule(@CurrentUser() user: AuthenticatedUser, @Body() dto: ScheduleSessionDto) {
    return this.service.schedule(user.tenantId, dto);
  }

  @Patch('sessions/:id')
  updateSession(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateSessionDto) {
    return this.service.updateSession(user.tenantId, id, dto);
  }
}

@Module({ controllers: [PtController], providers: [PtService] })
export class PtModule {}
