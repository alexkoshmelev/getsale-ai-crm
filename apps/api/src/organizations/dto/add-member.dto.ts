import { IsEmail, IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddMemberDto {
  @ApiProperty({ example: 'member@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'admin', enum: ['admin', 'bidi', 'viewer'] })
  @IsString()
  @IsIn(['admin', 'bidi', 'viewer'])
  role: string;
}

