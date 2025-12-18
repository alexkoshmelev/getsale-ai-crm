import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CampaignGoalsService } from './campaign-goals.service';
import { CreateCampaignGoalDto } from './dto/create-campaign-goal.dto';
import { UpdateCampaignGoalDto } from './dto/update-campaign-goal.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationId } from '../common/decorators/organization.decorator';

@ApiTags('campaign-goals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('campaign-goals')
export class CampaignGoalsController {
  constructor(private readonly campaignGoalsService: CampaignGoalsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a campaign goal' })
  create(@OrganizationId() organizationId: string, @Body() createDto: CreateCampaignGoalDto) {
    return this.campaignGoalsService.create(organizationId, createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all campaign goals' })
  findAll(
    @OrganizationId() organizationId: string,
    @Query('campaignId') campaignId?: string,
  ) {
    return this.campaignGoalsService.findAll(organizationId, campaignId);
  }

  @Get('with-progress')
  @ApiOperation({ summary: 'Get goals with progress tracking' })
  getGoalsWithProgress(
    @OrganizationId() organizationId: string,
    @Query('campaignId') campaignId?: string,
  ) {
    return this.campaignGoalsService.getGoalsWithProgress(organizationId, campaignId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get campaign goal by ID' })
  findOne(@Param('id') id: string, @OrganizationId() organizationId: string) {
    return this.campaignGoalsService.findOne(id, organizationId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update campaign goal' })
  update(
    @Param('id') id: string,
    @OrganizationId() organizationId: string,
    @Body() updateDto: UpdateCampaignGoalDto,
  ) {
    return this.campaignGoalsService.update(id, organizationId, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete campaign goal' })
  remove(@Param('id') id: string, @OrganizationId() organizationId: string) {
    return this.campaignGoalsService.remove(id, organizationId);
  }
}

