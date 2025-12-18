import { Module } from '@nestjs/common';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { UsageLimitsService } from './usage-limits.service';

@Module({
  controllers: [BillingController],
  providers: [BillingService, UsageLimitsService],
  exports: [BillingService, UsageLimitsService],
})
export class BillingModule {}

