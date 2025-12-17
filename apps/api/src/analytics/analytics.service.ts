import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getCompanyMetrics(organizationId: string, startDate: Date, endDate: Date) {
    // Get deals created in period
    const deals = await this.prisma.deal.findMany({
      where: {
        organizationId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        stage: true,
      },
    });

    // Get messages
    const messages = await this.prisma.message.findMany({
      where: {
        organizationId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Get contacts
    const contacts = await this.prisma.contact.findMany({
      where: {
        organizationId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Calculate metrics
    const totalDeals = deals.length;
    const wonDeals = deals.filter((d) => d.stage?.name?.toLowerCase().includes('deal')).length;
    const totalValue = deals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
    const messagesSent = messages.filter((m) => !m.isIncoming).length;
    const messagesReceived = messages.filter((m) => m.isIncoming).length;
    const replyRate = messagesSent > 0 ? (messagesReceived / messagesSent) * 100 : 0;
    const newContacts = contacts.length;

    // Deals by stage
    const dealsByStage = deals.reduce((acc, deal) => {
      const stageName = deal.stage?.name || 'Unknown';
      acc[stageName] = (acc[stageName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      deals: {
        total: totalDeals,
        won: wonDeals,
        totalValue,
        byStage: dealsByStage,
        conversionRate: totalDeals > 0 ? (wonDeals / totalDeals) * 100 : 0,
      },
      messages: {
        sent: messagesSent,
        received: messagesReceived,
        replyRate: Math.round(replyRate * 100) / 100,
      },
      contacts: {
        new: newContacts,
        total: await this.prisma.contact.count({ where: { organizationId } }),
      },
    };
  }

  async getBiDiMetrics(organizationId: string, userId: string, startDate: Date, endDate: Date) {
    const messages = await this.prisma.message.findMany({
      where: {
        organizationId,
        senderId: userId,
        senderType: 'user',
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const deals = await this.prisma.deal.findMany({
      where: {
        organizationId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const replies = await this.prisma.message.findMany({
      where: {
        organizationId,
        isIncoming: true,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    return {
      messagesSent: messages.length,
      replies: replies.length,
      deals: deals.length,
      replyRate: messages.length > 0 ? (replies.length / messages.length) * 100 : 0,
    };
  }

  async getAIMetrics(organizationId: string, startDate: Date, endDate: Date) {
    const executions = await this.prisma.agentExecution.findMany({
      where: {
        organizationId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const usageLogs = await this.prisma.usageLog.findMany({
      where: {
        organizationId,
        metricType: {
          startsWith: 'ai_',
        },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const successful = executions.filter((e) => e.status === 'success').length;
    const failed = executions.filter((e) => e.status === 'error').length;
    const totalTokens = executions.reduce((sum, e) => sum + (e.tokensUsed || 0), 0);

    return {
      totalExecutions: executions.length,
      successful,
      failed,
      successRate: executions.length > 0 ? (successful / executions.length) * 100 : 0,
      totalTokens,
      averageTokensPerExecution:
        executions.length > 0 ? Math.round(totalTokens / executions.length) : 0,
      totalCalls: usageLogs.length,
    };
  }

  async getPipelineMetrics(organizationId: string, pipelineId?: string) {
    const where: any = { organizationId };
    if (pipelineId) {
      where.pipelineId = pipelineId;
    }

    const deals = await this.prisma.deal.findMany({
      where,
      include: {
        stage: true,
        pipeline: true,
      },
    });

    const pipelines = await this.prisma.pipeline.findMany({
      where: { organizationId },
      include: {
        stages: {
          include: {
            _count: {
              select: {
                deals: true,
              },
            },
          },
        },
      },
    });

    const pipelineStats = pipelines.map((pipeline) => {
      const pipelineDeals = deals.filter((d) => d.pipelineId === pipeline.id);
      const totalValue = pipelineDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);

      return {
        id: pipeline.id,
        name: pipeline.name,
        totalDeals: pipelineDeals.length,
        totalValue,
        stages: pipeline.stages.map((stage) => ({
          id: stage.id,
          name: stage.name,
          dealCount: stage._count.deals,
        })),
      };
    });

    return {
      pipelines: pipelineStats,
      totalDeals: deals.length,
      totalValue: deals.reduce((sum, d) => sum + (Number(d.value) || 0), 0),
    };
  }
}

