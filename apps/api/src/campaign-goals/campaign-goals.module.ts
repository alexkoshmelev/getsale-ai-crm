import { Module } from '@nestjs/common';
import { CampaignGoalsService } from './campaign-goals.service';
import { CampaignGoalsController } from './campaign-goals.controller';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [EventsModule],
  controllers: [CampaignGoalsController],
  providers: [CampaignGoalsService],
  exports: [CampaignGoalsService],
})
export class CampaignGoalsModule {}

