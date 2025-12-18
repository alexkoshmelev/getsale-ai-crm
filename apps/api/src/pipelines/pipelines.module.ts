import { Module } from '@nestjs/common';
import { PipelinesService } from './pipelines.service';
import { PipelinesController } from './pipelines.controller';
import { PipelineAutoTransitionService } from './pipeline-auto-transition.service';
import { EventsModule } from '../events/events.module';
import { DealsModule } from '../deals/deals.module';

@Module({
  imports: [EventsModule, DealsModule],
  controllers: [PipelinesController],
  providers: [PipelinesService, PipelineAutoTransitionService],
  exports: [PipelinesService, PipelineAutoTransitionService],
})
export class PipelinesModule {}

