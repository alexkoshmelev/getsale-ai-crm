import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CampaignsService } from './campaigns.service';
import { CampaignsController } from './campaigns.controller';
import { CampaignsProcessor } from './campaigns.processor';
import { CampaignSequencesService } from './campaign-sequences.service';
import { EventsModule } from '../events/events.module';
import { RedisModule } from '../common/redis/redis.module';
import { TelegramModule } from '../telegram/telegram.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    EventsModule,
    TelegramModule,
    EmailModule,
    RedisModule,
    BullModule.registerQueue({
      name: 'campaigns',
    }),
  ],
  controllers: [CampaignsController],
  providers: [CampaignsService, CampaignsProcessor, CampaignSequencesService],
  exports: [CampaignsService, CampaignSequencesService],
})
export class CampaignsModule {}

