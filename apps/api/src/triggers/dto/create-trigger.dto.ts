import { IsString, IsNotEmpty, IsOptional, IsObject, IsArray, IsBoolean, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTriggerDto {
  @ApiProperty({ description: 'Trigger name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Trigger description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Event type to trigger on', example: 'message.received' })
  @IsString()
  @IsNotEmpty()
  eventType: string;

  @ApiProperty({ description: 'Conditions to match', example: {} })
  @IsObject()
  @IsOptional()
  conditions?: any;

  @ApiProperty({ description: 'Actions to execute', example: [{ type: 'move_deal', params: {} }] })
  @IsArray()
  @IsNotEmpty()
  actions: any[];

  @ApiPropertyOptional({ description: 'Is trigger active', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Execution priority', default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  priority?: number;
}

