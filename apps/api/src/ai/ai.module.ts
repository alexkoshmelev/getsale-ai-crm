import { Module } from '@nestjs/common';
import { AIService } from './ai.service';
import { AIController } from './ai.controller';
import { EventsModule } from '../events/events.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [EventsModule, BillingModule],
  controllers: [AIController],
  providers: [AIService],
  exports: [AIService],
})
export class AIModule {}

