import { Module } from '@nestjs/common';
import { BidiService } from './bidi.service';
import { BidiController } from './bidi.controller';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [EventsModule],
  controllers: [BidiController],
  providers: [BidiService],
  exports: [BidiService],
})
export class BidiModule {}

