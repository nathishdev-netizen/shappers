import { Module } from '@nestjs/common';
import { MembershipPlansService } from './membership-plans.service.js';
import { MembershipPlansController } from './membership-plans.controller.js';

@Module({
  controllers: [MembershipPlansController],
  providers: [MembershipPlansService],
})
export class MembershipPlansModule {}
