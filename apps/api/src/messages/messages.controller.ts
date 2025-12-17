import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { AIService } from '../ai/ai.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationId } from '../common/decorators/organization.decorator';
import { CurrentUser } from '../common/decorators/user.decorator';

@ApiTags('messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessagesController {
  constructor(
    private readonly messagesService: MessagesService,
    private readonly aiService: AIService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new message' })
  create(
    @OrganizationId() organizationId: string,
    @CurrentUser() user: any,
    @Body() createDto: CreateMessageDto,
  ) {
    return this.messagesService.create(organizationId, user.id, createDto);
  }

  @Get('chat/:chatId')
  @ApiOperation({ summary: 'Get messages for a chat' })
  findAll(
    @Param('chatId') chatId: string,
    @OrganizationId() organizationId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.messagesService.findAll(
      chatId,
      organizationId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
  }

  @Post('chat/:chatId/ai-draft')
  @ApiOperation({ summary: 'Generate AI draft reply for chat' })
  async generateDraft(
    @Param('chatId') chatId: string,
    @OrganizationId() organizationId: string,
    @Body('tone') tone?: 'professional' | 'friendly' | 'casual',
    @Body('context') context?: string,
  ) {
    const draft = await this.aiService.generateDraftReply({
      chatId,
      organizationId,
      tone,
      context,
    });
    return { draft };
  }
}