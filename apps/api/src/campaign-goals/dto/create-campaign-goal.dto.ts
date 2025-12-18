import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCampaignGoalDto {
  @ApiProperty({ description: 'Campaign ID' })
  @IsString()
  @IsNotEmpty()
  campaignId: string;

  @ApiProperty({
    description: 'Goal type',
    enum: ['replies_target', 'opens_target', 'clicks_target', 'meetings_target'],
  })
  @IsEnum(['replies_target', 'opens_target', 'clicks_target', 'meetings_target'])
  @IsNotEmpty()
  goalType: string;

  @ApiProperty({ description: 'Target value' })
  @IsNumber()
  @Min(0)
  targetValue: number;

  @ApiPropertyOptional({ description: 'Period (optional)', enum: ['month', 'week', 'quarter', 'year'] })
  @IsEnum(['month', 'week', 'quarter', 'year'])
  @IsOptional()
  period?: string;
}

