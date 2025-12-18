import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

export interface UsageLimits {
  seats: number;
  messagesPerMonth: number;
  aiCallsPerMonth: number;
}

@Injectable()
export class UsageLimitsService {
  private readonly logger = new Logger(UsageLimitsService.name);

  // Default limits per plan
  private readonly planLimits: Record<string, UsageLimits> = {
    free: {
      seats: 1,
      messagesPerMonth: 100,
      aiCallsPerMonth: 50,
    },
    pro: {
      seats: 5,
      messagesPerMonth: 5000,
      aiCallsPerMonth: 1000,
    },
    team: {
      seats: 20,
      messagesPerMonth: 50000,
      aiCallsPerMonth: 10000,
    },
    enterprise: {
      seats: 100,
      messagesPerMonth: -1, // unlimited
      aiCallsPerMonth: -1, // unlimited
    },
  };

  constructor(private prisma: PrismaService) {}

  /**
   * Get usage limits for organization based on subscription plan
   */
  async getLimits(organizationId: string): Promise<UsageLimits> {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        organizationId,
        status: 'active',
      },
      orderBy: { createdAt: 'desc' },
    });

    const plan = subscription?.plan || 'free';
    return this.planLimits[plan] || this.planLimits.free;
  }

  /**
   * Check if organization can add more seats
   */
  async canAddSeat(organizationId: string): Promise<boolean> {
    const limits = await this.getLimits(organizationId);
    const currentSeats = await this.prisma.organizationMember.count({
      where: { organizationId },
    });

    return limits.seats === -1 || currentSeats < limits.seats;
  }

  /**
   * Check if organization can send more messages this month
   */
  async canSendMessage(organizationId: string): Promise<boolean> {
    const limits = await this.getLimits(organizationId);
    if (limits.messagesPerMonth === -1) {
      return true; // unlimited
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const messagesCount = await this.prisma.usageLog.count({
      where: {
        organizationId,
        metricType: 'messages_sent',
        createdAt: { gte: startOfMonth },
      },
    });

    return messagesCount < limits.messagesPerMonth;
  }

  /**
   * Check if organization can make more AI calls this month
   */
  async canMakeAICall(organizationId: string): Promise<boolean> {
    const limits = await this.getLimits(organizationId);
    if (limits.aiCallsPerMonth === -1) {
      return true; // unlimited
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const aiCallsCount = await this.prisma.usageLog.count({
      where: {
        organizationId,
        metricType: { in: ['ai_draft_generation', 'ai_agent_execution'] },
        createdAt: { gte: startOfMonth },
      },
    });

    return aiCallsCount < limits.aiCallsPerMonth;
  }

  /**
   * Get current usage for organization
   */
  async getCurrentUsage(organizationId: string) {
    const limits = await this.getLimits(organizationId);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [seatsCount, messagesCount, aiCallsCount] = await Promise.all([
      this.prisma.organizationMember.count({
        where: { organizationId },
      }),
      limits.messagesPerMonth === -1
        ? Promise.resolve(0)
        : this.prisma.usageLog.count({
            where: {
              organizationId,
              metricType: 'messages_sent',
              createdAt: { gte: startOfMonth },
            },
          }),
      limits.aiCallsPerMonth === -1
        ? Promise.resolve(0)
        : this.prisma.usageLog.count({
            where: {
              organizationId,
              metricType: { in: ['ai_draft_generation', 'ai_agent_execution'] },
              createdAt: { gte: startOfMonth },
            },
          }),
    ]);

    return {
      seats: {
        used: seatsCount,
        limit: limits.seats,
        available: limits.seats === -1 ? -1 : limits.seats - seatsCount,
      },
      messages: {
        used: messagesCount,
        limit: limits.messagesPerMonth,
        available: limits.messagesPerMonth === -1 ? -1 : limits.messagesPerMonth - messagesCount,
      },
      aiCalls: {
        used: aiCallsCount,
        limit: limits.aiCallsPerMonth,
        available: limits.aiCallsPerMonth === -1 ? -1 : limits.aiCallsPerMonth - aiCallsCount,
      },
    };
  }

  /**
   * Validate and throw if limit exceeded
   */
  async validateSeatLimit(organizationId: string) {
    if (!(await this.canAddSeat(organizationId))) {
      throw new BadRequestException('Seat limit exceeded. Please upgrade your plan.');
    }
  }

  async validateMessageLimit(organizationId: string) {
    if (!(await this.canSendMessage(organizationId))) {
      throw new BadRequestException('Message limit exceeded for this month. Please upgrade your plan.');
    }
  }

  async validateAICallLimit(organizationId: string) {
    if (!(await this.canMakeAICall(organizationId))) {
      throw new BadRequestException('AI call limit exceeded for this month. Please upgrade your plan.');
    }
  }
}

