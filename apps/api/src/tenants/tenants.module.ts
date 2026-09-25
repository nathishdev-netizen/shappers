import { Module } from '@nestjs/common';
import { TenantsService } from './tenants.service.js';
import { TenantsController } from './tenants.controller.js';

@Module({
  controllers: [TenantsController],
  providers: [TenantsService],
})
export class TenantsModule {}
