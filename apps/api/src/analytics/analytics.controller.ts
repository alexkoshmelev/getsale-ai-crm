import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationId } from '../common/decorators/organization.decorator';
import { CurrentUser } from '../common/decorators/user.decorator';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('company')
  @ApiOperation({ summary: 'Get company metrics' })
  async getCompanyMetrics(
    @OrganizationId() organizationId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    return this.analyticsService.getCompanyMetrics(organizationId, start, end);
  }

  @Get('bidi')
  @ApiOperation({ summary: 'Get BiDi metrics' })
  async getBiDiMetrics(
    @OrganizationId() organizationId: string,
    @CurrentUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    return this.analyticsService.getBiDiMetrics(organizationId, user.id, start, end);
  }

  @Get('ai')
  @ApiOperation({ summary: 'Get AI metrics' })
  async getAIMetrics(
    @OrganizationId() organizationId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    return this.analyticsService.getAIMetrics(organizationId, start, end);
  }

  @Get('pipeline')
  @ApiOperation({ summary: 'Get pipeline metrics' })
  async getPipelineMetrics(
    @OrganizationId() organizationId: string,
    @Query('pipelineId') pipelineId?: string,
  ) {
    return this.analyticsService.getPipelineMetrics(organizationId, pipelineId);
  }
}

