import { Module } from '@nestjs/common';
import { TriggersService } from './triggers.service';
import { TriggersController } from './triggers.controller';
import { EventsModule } from '../events/events.module';
import { DealsModule } from '../deals/deals.module';
import { MessagesModule } from '../messages/messages.module';

@Module({
  imports: [EventsModule, DealsModule, MessagesModule],
  controllers: [TriggersController],
  providers: [TriggersService],
  exports: [TriggersService],
})
export class TriggersModule {}

