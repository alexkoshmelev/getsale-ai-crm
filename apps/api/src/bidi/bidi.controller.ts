import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BidiService } from './bidi.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationId } from '../common/decorators/organization.decorator';
import { CurrentUser } from '../common/decorators/user.decorator';

@ApiTags('bidi')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bidi')
export class BidiController {
  constructor(private readonly bidiService: BidiService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get BiDi dashboard (all BiDis or specific)' })
  getDashboard(
    @OrganizationId() organizationId: string,
    @Param('bidiId') bidiId?: string,
  ) {
    return this.bidiService.getDashboard(organizationId, bidiId);
  }

  @Post('contacts/:contactId/assign')
  @ApiOperation({ summary: 'Assign contact to BiDi' })
  assignContact(
    @Param('contactId') contactId: string,
    @Body('bidiId') bidiId: string,
    @OrganizationId() organizationId: string,
    @CurrentUser() user: any,
  ) {
    return this.bidiService.assignContact(organizationId, contactId, bidiId, user.id);
  }

  @Post('chats/:chatId/assign')
  @ApiOperation({ summary: 'Assign chat to BiDi' })
  assignChat(
    @Param('chatId') chatId: string,
    @Body('bidiId') bidiId: string,
    @OrganizationId() organizationId: string,
    @CurrentUser() user: any,
  ) {
    return this.bidiService.assignChat(organizationId, chatId, bidiId, user.id);
  }

  @Get(':bidiId/workload')
  @ApiOperation({ summary: 'Get BiDi workload (contacts and chats)' })
  getWorkload(@Param('bidiId') bidiId: string) {
    return this.bidiService.getWorkload(bidiId);
  }

  @Get(':bidiId/performance')
  @ApiOperation({ summary: 'Get BiDi performance metrics' })
  getPerformance(@Param('bidiId') bidiId: string) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    return this.bidiService.getPerformance(bidiId, start, end);
  }

  @Patch(':bidiId/targets')
  @ApiOperation({ summary: 'Update BiDi targets' })
  updateTargets(
    @Param('bidiId') bidiId: string,
    @OrganizationId() organizationId: string,
    @Body() targets: { targetReplies?: number; targetMeetings?: number; targetRevenue?: number },
  ) {
    return this.bidiService.updateTargets(organizationId, bidiId, targets);
  }
}

