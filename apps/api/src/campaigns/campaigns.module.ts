import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CampaignsService } from './campaigns.service';
import { CampaignsController } from './campaigns.controller';
import { CampaignsProcessor } from './campaigns.processor';
import { EventsModule } from '../events/events.module';
import { TelegramModule } from '../telegram/telegram.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    EventsModule,
    TelegramModule,
    EmailModule,
    BullModule.registerQueue({
      name: 'campaigns',
    }),
  ],
  controllers: [CampaignsController],
  providers: [CampaignsService, CampaignsProcessor],
  exports: [CampaignsService],
})
export class CampaignsModule {}

