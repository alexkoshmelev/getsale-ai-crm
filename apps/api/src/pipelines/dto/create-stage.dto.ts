import { IsString, IsInt, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateStageDto {
  @ApiProperty({ example: 'Qualified' })
  @IsString()
  name: string;

  @ApiProperty({ example: 2 })
  @IsInt()
  orderIndex: number;

  @ApiProperty({ required: false, example: '#8b5cf6' })
  @IsOptional()
  @IsString()
  color?: string;
}

