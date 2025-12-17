import { Module } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { TelegramModule } from '../telegram/telegram.module';
import { AIModule } from '../ai/ai.module';

@Module({
  imports: [TelegramModule, AIModule],
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}

