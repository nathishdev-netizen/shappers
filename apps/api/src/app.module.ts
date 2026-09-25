import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { TenantsModule } from './tenants/tenants.module.js';
import { MembersModule } from './members/members.module.js';
import { MembershipPlansModule } from './membership-plans/membership-plans.module.js';
import { AttendanceModule } from './attendance/attendance.module.js';
import { AnalyticsModule } from './analytics/analytics.module.js';
import { BranchesModule } from './branches/branches.module.js';
import { StaffModule } from './staff/staff.module.js';
import { LeadsModule } from './leads/leads.module.js';
import { PtModule } from './pt/pt.module.js';
import { DietModule } from './diet/diet.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { ClassesModule } from './classes/classes.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    TenantsModule,
    MembersModule,
    MembershipPlansModule,
    AttendanceModule,
    AnalyticsModule,
    BranchesModule,
    StaffModule,
    LeadsModule,
    PtModule,
    DietModule,
    PaymentsModule,
    ClassesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
