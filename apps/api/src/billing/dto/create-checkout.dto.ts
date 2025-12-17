import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCheckoutDto {
  @ApiProperty({ example: 'pro', enum: ['pro', 'team', 'enterprise'] })
  @IsString()
  @IsIn(['pro', 'team', 'enterprise'])
  plan: string;

  @ApiProperty({ example: 'monthly', enum: ['monthly', 'yearly'] })
  @IsString()
  @IsIn(['monthly', 'yearly'])
  billingCycle: string;
}

