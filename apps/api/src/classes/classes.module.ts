import {
  BadRequestException, Body, Controller, Get, Injectable, Module, NotFoundException, Param, Post, Query, UseGuards,
} from '@nestjs/common';
import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser, type AuthenticatedUser } from '../auth/decorators/current-user.decorator.js';

export class CreateClassDto {
  @IsString() name!: string;
  @IsOptional() @IsString() description?: string;
  @IsDateString() startsAt!: string;
  @IsDateString() endsAt!: string;
  @IsOptional() @IsInt() @Min(1) capacity?: number;
  @IsOptional() @IsString() trainerId?: string;
  @IsOptional() @IsString() branchId?: string;
}

export class BookClassDto {
  @IsString() memberId!: string;
}

@Injectable()
export class ClassesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, from: Date, to: Date) {
    const classes = await this.prisma.gymClass.findMany({
      where: { tenantId, startsAt: { gte: from, lte: to } },
      orderBy: { startsAt: 'asc' },
      include: {
        branch: { select: { id: true, name: true } },
        _count: { select: { bookings: true } },
      },
    });

    const trainerIds = [...new Set(classes.map((c) => c.trainerId).filter(Boolean))] as string[];
    const trainers = await this.prisma.user.findMany({
      where: { id: { in: trainerIds } },
      select: { id: true, firstName: true, lastName: true },
    });
    const byId = new Map(trainers.map((t) => [t.id, t]));

    return classes.map(({ _count, ...c }) => ({
      ...c,
      booked: _count.bookings,
      spotsLeft: c.capacity - _count.bookings,
      trainer: c.trainerId ? byId.get(c.trainerId) ?? null : null,
    }));
  }

  create(tenantId: string, dto: CreateClassDto) {
    return this.prisma.gymClass.create({
      data: { tenantId, ...dto, startsAt: new Date(dto.startsAt), endsAt: new Date(dto.endsAt) },
    });
  }

  async book(tenantId: string, classId: string, dto: BookClassDto) {
    const gymClass = await this.prisma.gymClass.findFirst({
      where: { id: classId, tenantId },
      include: { _count: { select: { bookings: true } } },
    });
    if (!gymClass) throw new NotFoundException('Class not found');
    if (gymClass._count.bookings >= gymClass.capacity) throw new BadRequestException('Class is full');

    return this.prisma.booking.create({
      data: { gymClassId: classId, memberId: dto.memberId, trainerId: gymClass.trainerId ?? undefined },
    });
  }
}

@UseGuards(JwtAuthGuard)
@Controller('classes')
export class ClassesController {
  constructor(private readonly service: ClassesService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query('from') from?: string, @Query('to') to?: string) {
    const start = from ? new Date(from) : new Date(new Date().setHours(0, 0, 0, 0));
    const end = to ? new Date(to) : new Date(start.getTime() + 7 * 86_400_000);
    return this.service.list(user.tenantId, start, end);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateClassDto) {
    return this.service.create(user.tenantId, dto);
  }

  @Post(':id/book')
  book(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: BookClassDto) {
    return this.service.book(user.tenantId, id, dto);
  }
}

@Module({ controllers: [ClassesController], providers: [ClassesService] })
export class ClassesModule {}
