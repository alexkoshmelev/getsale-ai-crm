import { PartialType } from '@nestjs/swagger';
import { CreateDealDto } from './create-deal.dto';

export class UpdateDealDto extends PartialType(CreateDealDto) {
  // Remove pipelineId from updates
  pipelineId?: never;
}

