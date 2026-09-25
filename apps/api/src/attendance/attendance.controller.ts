import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser, type AuthenticatedUser } from '../auth/decorators/current-user.decorator.js';
import { AttendanceService } from './attendance.service.js';
import { CheckInDto } from './dto/check-in.dto.js';

@UseGuards(JwtAuthGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('check-in')
  checkIn(@CurrentUser() user: AuthenticatedUser, @Body() dto: CheckInDto) {
    return this.attendanceService.checkIn(user.tenantId, dto);
  }

  @Get('today')
  today(@CurrentUser() user: AuthenticatedUser) {
    return this.attendanceService.today(user.tenantId);
  }
}
