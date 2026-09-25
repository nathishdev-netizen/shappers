import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CheckInDto } from './dto/check-in.dto.js';

/** Local midnight — using UTC would roll the day over at 5:30am in India. */
function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * One check-in per member per day. A second tap — a double-click at the desk,
   * a member scanning again on the way back from the car park — returns the
   * existing record instead of logging a duplicate, so the day's list stays a
   * roll call of who trained rather than a tally of door events.
   */
  async checkIn(tenantId: string, dto: CheckInDto) {
    const existing = await this.prisma.attendanceEvent.findFirst({
      where: { tenantId, memberId: dto.memberId, checkedInAt: { gte: startOfToday() } },
      include: { member: true },
    });
    if (existing) return existing;

    return this.prisma.attendanceEvent.create({
      data: { tenantId, memberId: dto.memberId, source: dto.source },
      include: { member: true },
    });
  }

  async today(tenantId: string) {
    return this.prisma.attendanceEvent.findMany({
      where: { tenantId, checkedInAt: { gte: startOfToday() } },
      include: { member: true },
      orderBy: { checkedInAt: 'desc' },
    });
  }
}
