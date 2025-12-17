import { Module, forwardRef } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { EmailModule } from '../email/email.module';
import { TelegramModule } from '../telegram/telegram.module';
import { WebSocketModule } from '../websocket/websocket.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [EmailModule, forwardRef(() => TelegramModule), WebSocketModule, EventsModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}

