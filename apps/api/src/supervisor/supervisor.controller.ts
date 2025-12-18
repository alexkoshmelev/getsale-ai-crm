import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SupervisorService } from './supervisor.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationId } from '../common/decorators/organization.decorator';
import { CurrentUser } from '../common/decorators/user.decorator';

@ApiTags('supervisor')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('supervisor')
export class SupervisorController {
  constructor(private readonly supervisorService: SupervisorService) {}

  @Get('chats')
  @ApiOperation({ summary: 'Get all chats (supervisor view)' })
  getAllChats(
    @OrganizationId() organizationId: string,
    @Query('bidiId') bidiId?: string,
    @Query('isUnread') isUnread?: boolean,
  ) {
    return this.supervisorService.getAllChats(organizationId, { bidiId, isUnread: isUnread === true });
  }

  @Get('bidi-replies')
  @ApiOperation({ summary: 'Get BiDi replies for review' })
  getBidiReplies(
    @OrganizationId() organizationId: string,
    @Query('bidiId') bidiId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.supervisorService.getBidiReplies(organizationId, bidiId, limit ? parseInt(limit) : 50);
  }

  @Get('ai-messages')
  @ApiOperation({ summary: 'Get AI messages for review' })
  getAIMessages(
    @OrganizationId() organizationId: string,
    @Query('limit') limit?: string,
  ) {
    return this.supervisorService.getAIMessages(organizationId, limit ? parseInt(limit) : 50);
  }

  @Post('chats/:chatId/takeover')
  @ApiOperation({ summary: 'Take over chat (supervisor mode)' })
  takeOverChat(
    @Param('chatId') chatId: string,
    @OrganizationId() organizationId: string,
    @CurrentUser() user: any,
  ) {
    return this.supervisorService.takeOverChat(organizationId, chatId, user.id);
  }

  @Post('messages/:messageId/override')
  @ApiOperation({ summary: 'Override AI decision' })
  overrideAIDecision(
    @Param('messageId') messageId: string,
    @OrganizationId() organizationId: string,
    @CurrentUser() user: any,
    @Body('reason') reason: string,
  ) {
    return this.supervisorService.overrideAIDecision(organizationId, messageId, user.id, reason);
  }

  @Get('chats/:chatId/audit')
  @ApiOperation({ summary: 'Get chat audit trail' })
  getChatAuditTrail(
    @Param('chatId') chatId: string,
    @OrganizationId() organizationId: string,
  ) {
    return this.supervisorService.getChatAuditTrail(organizationId, chatId);
  }
}

