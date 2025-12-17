import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrganizationDto {
  @ApiProperty({ example: 'My Company' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'my-company', required: false })
  @IsOptional()
  @IsString()
  slug?: string;
}

