import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePlanDto } from './dto/create-plan.dto.js';

@Injectable()
export class MembershipPlansService {
  constructor(private readonly prisma: PrismaService) {}

  create(tenantId: string, dto: CreatePlanDto) {
    return this.prisma.membershipPlan.create({ data: { tenantId, ...dto } });
  }

  findAll(tenantId: string) {
    return this.prisma.membershipPlan.findMany({
      where: { tenantId, isActive: true },
      orderBy: { priceCents: 'asc' },
    });
  }
}
