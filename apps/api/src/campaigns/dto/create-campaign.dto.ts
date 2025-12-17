import { IsString, IsOptional, IsObject, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCampaignDto {
  @ApiProperty({ example: 'Q1 Outreach Campaign' })
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: {
      tags: ['prospect'],
      companyIds: [],
      stages: ['Cold'],
      limit: 100,
    },
  })
  @IsObject()
  targetAudience: any;

  @ApiProperty({
    example: 'Hello {{firstName}}, I wanted to reach out about...',
  })
  @IsString()
  messageTemplate: string;

  @ApiProperty({ required: false, enum: ['manual', 'scheduled', 'event'] })
  @IsOptional()
  @IsString()
  triggerType?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  triggerConfig?: any;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

