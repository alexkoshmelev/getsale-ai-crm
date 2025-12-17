import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMessageDto {
  @ApiProperty({ example: 'chat-id' })
  @IsString()
  chatId: string;

  @ApiProperty({ example: 'Hello, how are you?' })
  @IsString()
  content: string;
}

