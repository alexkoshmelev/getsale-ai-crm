import { IsString, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ExecuteAgentDto {
  @ApiProperty({ example: 'agent-id' })
  @IsString()
  agentId: string;

  @ApiProperty({ example: { eventType: 'message_received', contactId: 'contact-id' } })
  @IsObject()
  input: any;
}

