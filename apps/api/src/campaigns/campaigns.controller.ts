import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationId } from '../common/decorators/organization.decorator';

@ApiTags('campaigns')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new campaign' })
  create(@OrganizationId() organizationId: string, @Body() createDto: CreateCampaignDto) {
    return this.campaignsService.create(organizationId, createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all campaigns' })
  findAll(@OrganizationId() organizationId: string) {
    return this.campaignsService.findAll(organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get campaign by ID' })
  findOne(@Param('id') id: string, @OrganizationId() organizationId: string) {
    return this.campaignsService.findOne(id, organizationId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update campaign' })
  update(
    @Param('id') id: string,
    @OrganizationId() organizationId: string,
    @Body() updateDto: UpdateCampaignDto,
  ) {
    return this.campaignsService.update(id, organizationId, updateDto);
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Start campaign' })
  start(@Param('id') id: string, @OrganizationId() organizationId: string) {
    return this.campaignsService.start(id, organizationId);
  }

  @Post(':id/pause')
  @ApiOperation({ summary: 'Pause campaign' })
  pause(@Param('id') id: string, @OrganizationId() organizationId: string) {
    return this.campaignsService.pause(id, organizationId);
  }

  @Post(':id/stop')
  @ApiOperation({ summary: 'Stop campaign' })
  stop(@Param('id') id: string, @OrganizationId() organizationId: string) {
    return this.campaignsService.stop(id, organizationId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete campaign' })
  remove(@Param('id') id: string, @OrganizationId() organizationId: string) {
    return this.campaignsService.remove(id, organizationId);
  }
}

