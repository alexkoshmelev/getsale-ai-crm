import { PartialType } from '@nestjs/swagger';
import { CreateCampaignGoalDto } from './create-campaign-goal.dto';

export class UpdateCampaignGoalDto extends PartialType(CreateCampaignGoalDto) {}

