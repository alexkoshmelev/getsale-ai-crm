import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AIService } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationId } from '../common/decorators/organization.decorator';
import { GenerateDraftDto } from './dto/generate-draft.dto';
import { ExecuteAgentDto } from './dto/execute-agent.dto';

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AIController {
  constructor(private readonly aiService: AIService) {}

  @Post('draft')
  @ApiOperation({ summary: 'Generate AI draft reply' })
  async generateDraft(
    @OrganizationId() organizationId: string,
    @Body() generateDraftDto: GenerateDraftDto,
  ) {
    const draft = await this.aiService.generateDraftReply({
      chatId: generateDraftDto.chatId,
      organizationId,
      context: generateDraftDto.context,
      tone: generateDraftDto.tone,
    });
    return { draft };
  }

  @Post('agents/:agentId/execute')
  @ApiOperation({ summary: 'Execute AI agent' })
  async executeAgent(
    @Body() executeAgentDto: ExecuteAgentDto,
    @OrganizationId() organizationId: string,
  ) {
    return this.aiService.generateAgentResponse(
      executeAgentDto.agentId,
      organizationId,
      executeAgentDto.input,
    );
  }
}

