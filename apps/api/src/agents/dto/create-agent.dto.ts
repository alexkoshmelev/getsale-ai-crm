import { IsString, IsOptional, IsIn, IsNumber, Min, Max, IsBoolean, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAgentDto {
  @ApiProperty({ example: 'BizDev Assistant' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'bizdev', enum: ['bizdev', 'sdr', 'followup', 'analytics', 'admin'] })
  @IsString()
  @IsIn(['bizdev', 'sdr', 'followup', 'analytics', 'admin'])
  type: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'You are a business development assistant. {{memory}}' })
  @IsString()
  promptTemplate: string;

  @ApiProperty({ required: false, default: 'gpt-4' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiProperty({ required: false, default: 0.7, minimum: 0, maximum: 2 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @ApiProperty({ required: false, default: 2000 })
  @IsOptional()
  @IsNumber()
  maxTokens?: number;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tools?: string[];

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

