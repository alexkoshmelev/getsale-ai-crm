import { Module } from '@nestjs/common';
import { WebSocketGateway } from './websocket.gateway';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [EventsModule],
  providers: [WebSocketGateway],
  exports: [WebSocketGateway],
})
export class WebSocketModule {}

