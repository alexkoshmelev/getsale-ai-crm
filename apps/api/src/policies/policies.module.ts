import { Module } from '@nestjs/common';
import { PoliciesService } from './policies.service';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [EventsModule],
  providers: [PoliciesService],
  exports: [PoliciesService],
})
export class PoliciesModule {}

