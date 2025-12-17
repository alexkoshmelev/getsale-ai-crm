import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendEmailDto {
  @ApiProperty({ example: 'contact-id' })
  @IsString()
  contactId: string;

  @ApiProperty({ example: 'Hello from GetSale CRM' })
  @IsString()
  subject: string;

  @ApiProperty({ example: 'This is the email body...' })
  @IsString()
  text: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  html?: string;
}

