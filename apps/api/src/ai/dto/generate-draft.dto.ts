import { IsString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateDraftDto {
  @ApiProperty({ example: 'chat-id' })
  @IsString()
  chatId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  context?: string;

  @ApiProperty({ required: false, enum: ['professional', 'friendly', 'casual'] })
  @IsOptional()
  @IsIn(['professional', 'friendly', 'casual'])
  tone?: 'professional' | 'friendly' | 'casual';
}

