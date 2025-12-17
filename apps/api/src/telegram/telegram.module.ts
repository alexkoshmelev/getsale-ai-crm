import { Module, forwardRef } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { TelegramController } from './telegram.controller';
import { EventsModule } from '../events/events.module';
import { WebSocketModule } from '../websocket/websocket.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [EventsModule, WebSocketModule, forwardRef(() => NotificationsModule)],
  controllers: [TelegramController],
  providers: [TelegramService],
  exports: [TelegramService],
})

