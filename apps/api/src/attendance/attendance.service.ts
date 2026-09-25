import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CheckInDto } from './dto/check-in.dto.js';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  checkIn(tenantId: string, dto: CheckInDto) {
    return this.prisma.attendanceEvent.create({
      data: { tenantId, memberId: dto.memberId, source: dto.source },
      include: { member: true },
    });
  }

  async today(tenantId: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    return this.prisma.attendanceEvent.findMany({
      where: { tenantId, checkedInAt: { gte: startOfDay } },
      include: { member: true },
      orderBy: { checkedInAt: 'desc' },
    });
  }
}
