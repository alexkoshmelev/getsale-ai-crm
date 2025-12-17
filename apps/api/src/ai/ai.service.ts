import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { EventsService, EventType } from '../events/events.service';
import axios from 'axios';

interface AIDraftRequest {
  chatId: string;
  organizationId: string;
  context?: string;
  tone?: 'professional' | 'friendly' | 'casual';
}

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private openaiApiKey: string;
  private openaiModel: string;
  private openaiUrl = 'https://api.openai.com/v1/chat/completions';

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private eventsService: EventsService,
  ) {
    this.openaiApiKey = this.configService.get<string>('OPENAI_API_KEY') || '';
    this.openaiModel = this.configService.get<string>('OPENAI_MODEL') || 'gpt-4';
  }

  async generateDraftReply(request: AIDraftRequest): Promise<string> {
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Get chat and context - verify it belongs to the organization
    const chat = await this.prisma.chat.findFirst({
      where: {
        id: request.chatId,
        organizationId: request.organizationId,
      },
      include: {
        contact: {
          include: {
            company: true,
          },
        },
        messages: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!chat) {
      throw new NotFoundException('Chat not found or access denied');
    }

    // Build context
    const contactName =
      chat.contact.firstName || chat.contact.lastName
        ? `${chat.contact.firstName || ''} ${chat.contact.lastName || ''}`.trim()
        : chat.contact.email || 'Contact';
    const companyName = chat.contact.company?.name || '';
    const recentMessages = chat.messages
      .reverse()
      .map((m) => `${m.isIncoming ? contactName : 'You'}: ${m.content}`)
      .join('\n');

    const systemPrompt = `You are a professional business development assistant. Generate a concise, ${request.tone || 'professional'} reply to continue the conversation. Keep it brief (2-3 sentences max) and action-oriented.`;

    const userPrompt = `Context:
Contact: ${contactName}${companyName ? ` from ${companyName}` : ''}
${chat.contact.role ? `Role: ${chat.contact.role}` : ''}

Recent conversation:
${recentMessages}

${request.context ? `Additional context: ${request.context}` : ''}

Generate a reply draft:`;

    try {
      const response = await axios.post(
        this.openaiUrl,
        {
          model: this.openaiModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 200,
        },
        {
          headers: {
            Authorization: `Bearer ${this.openaiApiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const draft = response.data.choices[0]?.message?.content?.trim();
      if (!draft) {
        throw new Error('No draft generated');
      }

      // Log usage
      await this.logAIUsage(chat.organizationId, 'draft_generation', {
        chatId: request.chatId,
        tokens: response.data.usage?.total_tokens || 0,
      });

      // Publish event
      await this.eventsService.publish(EventType.AI_DRAFT_GENERATED, {
        organizationId: request.organizationId,
        entityType: 'chat',
        entityId: request.chatId,
        data: { chatId: request.chatId, draft },
      });

      return draft;
    } catch (error: any) {
      this.logger.error('Failed to generate AI draft', error);
      throw new Error(`AI draft generation failed: ${error.message}`);
    }
  }

  async generateAgentResponse(
    agentId: string,
    organizationId: string,
    input: any,
  ): Promise<any> {
    const agent = await this.prisma.aiAgent.findFirst({
      where: {
        id: agentId,
        organizationId,
        isActive: true,
      },
    });

    if (!agent) {
      throw new Error('Agent not found or inactive');
    }

    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Get agent memory if needed
    const memories = await this.prisma.agentMemory.findMany({
      where: {
        agentId,
        organizationId,
        ...(input.contactId && { contactId: input.contactId }),
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
    });

    const memoryContext = memories
      .map((m) => `${m.memoryType}: ${m.content}`)
      .join('\n');

    const systemPrompt = agent.promptTemplate.replace('{{memory}}', memoryContext || 'No previous context');

    try {
      const startTime = Date.now();
      const response = await axios.post(
        this.openaiUrl,
        {
          model: agent.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: JSON.stringify(input) },
          ],
          temperature: Number(agent.temperature),
          max_tokens: agent.maxTokens,
        },
        {
          headers: {
            Authorization: `Bearer ${this.openaiApiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );
      const executionTimeMs = Date.now() - startTime;

      const result = response.data.choices[0]?.message?.content;

      // Log execution
      const execution = await this.prisma.agentExecution.create({
        data: {
          agentId,
          organizationId,
          triggerEvent: input.eventType || 'manual',
          inputData: input,
          outputData: { response: result },
          status: 'success',
          tokensUsed: response.data.usage?.total_tokens || 0,
          executionTimeMs,
        },
      });

      // Log usage
      await this.logAIUsage(organizationId, 'agent_execution', {
        agentId,
        agentType: agent.type,
        tokens: response.data.usage?.total_tokens || 0,
      });

      // Publish event
      await this.eventsService.publish(EventType.AI_AGENT_TRIGGERED, {
        organizationId,
        entityType: 'ai_agent',
        entityId: agentId,
        agentId,
        data: { agentId, agentType: agent.type, executionId: execution.id, input, output: result },
      });

      return JSON.parse(result || '{}');
    } catch (error: any) {
      this.logger.error('Agent execution failed', error);

      // Log failed execution
      await this.prisma.agentExecution.create({
        data: {
          agentId,
          organizationId,
          triggerEvent: input.eventType || 'manual',
          inputData: input,
          status: 'error',
          errorMessage: error.message,
        },
      });

      throw error;
    }
  }

  private async logAIUsage(organizationId: string, metricType: string, metadata: any) {
    await this.prisma.usageLog.create({
      data: {
        organizationId,
        metricType: `ai_${metricType}`,
        quantity: 1,
        metadata,
      },
    });
  }
}

