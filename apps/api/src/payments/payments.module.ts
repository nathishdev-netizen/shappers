import {
  BadRequestException, Body, Controller, Get, Injectable, Module, NotFoundException, Param, Post, Query, UseGuards,
} from '@nestjs/common';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PaymentMethod, PaymentStatus, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser, type AuthenticatedUser } from '../auth/decorators/current-user.decorator.js';

export class RecordPaymentDto {
  @IsString() memberId!: string;
  @IsInt() @Min(1) amountCents!: number;
  @IsEnum(PaymentMethod) method!: PaymentMethod;
  @IsOptional() @IsString() note?: string;
}

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Invoice ledger: every payment row across the club, newest first. */
  async list(tenantId: string, status?: PaymentStatus) {
    return this.prisma.payment.findMany({
      where: { subscription: { member: { tenantId } }, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        subscription: {
          select: {
            membershipPlan: { select: { name: true } },
            member: { select: { id: true, firstName: true, lastName: true, phone: true } },
          },
        },
      },
    });
  }

  /**
   * Settle what a member owes. The amount is applied against pending rows oldest-first;
   * any excess becomes a fresh receipt. Clearing the balance also lifts PAST_DUE.
   */
  async record(tenantId: string, dto: RecordPaymentDto) {
    const member = await this.prisma.member.findFirst({
      where: { id: dto.memberId, tenantId },
      include: {
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { payments: { where: { status: { in: ['PENDING', 'FAILED'] } }, orderBy: { dueAt: 'asc' } } },
        },
      },
    });
    if (!member) throw new NotFoundException('Member not found');

    const subscription = member.subscriptions[0];
    if (!subscription) throw new BadRequestException('Member has no membership to pay against');

    const now = new Date();
    const invoiceNumber = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${Math.floor(Math.random() * 90000 + 10000)}`;

    return this.prisma.$transaction(async (tx) => {
      let remaining = dto.amountCents;
      const settled: string[] = [];

      for (const due of subscription.payments) {
        if (remaining <= 0) break;
        if (remaining >= due.amountCents) {
          await tx.payment.update({
            where: { id: due.id },
            data: { status: PaymentStatus.SUCCEEDED, method: dto.method, paidAt: now, invoiceNumber, note: dto.note },
          });
          remaining -= due.amountCents;
          settled.push(due.id);
        } else {
          // Partial: split the due row into a paid part and a smaller outstanding part.
          await tx.payment.update({ where: { id: due.id }, data: { amountCents: due.amountCents - remaining } });
          await tx.payment.create({
            data: {
              subscriptionId: subscription.id, amountCents: remaining, currency: due.currency,
              status: PaymentStatus.SUCCEEDED, method: dto.method, paidAt: now, invoiceNumber, note: dto.note,
            },
          });
          remaining = 0;
        }
      }

      if (remaining > 0) {
        await tx.payment.create({
          data: {
            subscriptionId: subscription.id, amountCents: remaining, currency: 'INR',
            status: PaymentStatus.SUCCEEDED, method: dto.method, paidAt: now, invoiceNumber, note: dto.note,
          },
        });
      }

      const stillOwing = await tx.payment.count({
        where: { subscriptionId: subscription.id, status: { in: ['PENDING', 'FAILED'] } },
      });
      if (stillOwing === 0 && subscription.status === SubscriptionStatus.PAST_DUE) {
        await tx.subscription.update({ where: { id: subscription.id }, data: { status: SubscriptionStatus.ACTIVE } });
      }

      return { invoiceNumber, settledRows: settled.length, amountCents: dto.amountCents, balanceCleared: stillOwing === 0 };
    });
  }
}

@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query('status') status?: PaymentStatus) {
    return this.service.list(user.tenantId, status);
  }

  @Post()
  record(@CurrentUser() user: AuthenticatedUser, @Body() dto: RecordPaymentDto) {
    return this.service.record(user.tenantId, dto);
  }
}

@Module({ controllers: [PaymentsController], providers: [PaymentsService] })
export class PaymentsModule {}
