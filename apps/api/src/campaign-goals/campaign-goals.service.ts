import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { EventsService, EventType } from '../events/events.service';
import { CreateCampaignGoalDto } from './dto/create-campaign-goal.dto';
import { UpdateCampaignGoalDto } from './dto/update-campaign-goal.dto';

@Injectable()
export class CampaignGoalsService {
  private readonly logger = new Logger(CampaignGoalsService.name);

  constructor(
    private prisma: PrismaService,
    private eventsService: EventsService,
  ) {}

  async create(organizationId: string, createDto: CreateCampaignGoalDto) {
    // Verify campaign belongs to organization
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: createDto.campaignId, organizationId },
    });
    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const goal = await this.prisma.campaignGoal.create({
      data: {
        ...createDto,
        organizationId,
      },
    });

    await this.eventsService.publish(EventType.CAMPAIGN_STARTED, {
      organizationId,
      entityType: 'campaign_goal',
      entityId: goal.id,
      data: { goal },
    });

    return goal;
  }

  async findAll(organizationId: string, campaignId?: string) {
    const where: any = { organizationId };
    if (campaignId) {
      where.campaignId = campaignId;
    }

    return this.prisma.campaignGoal.findMany({
      where,
      include: {
        campaign: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, organizationId: string) {
    const goal = await this.prisma.campaignGoal.findFirst({
      where: { id, organizationId },
      include: {
        campaign: true,
      },
    });

    if (!goal) {
      throw new NotFoundException('Campaign goal not found');
    }

    return goal;
  }

  async update(id: string, organizationId: string, updateDto: UpdateCampaignGoalDto) {
    await this.findOne(id, organizationId);

    return this.prisma.campaignGoal.update({
      where: { id },
      data: updateDto,
    });
  }

  async remove(id: string, organizationId: string) {
    await this.findOne(id, organizationId);

    return this.prisma.campaignGoal.delete({
      where: { id },
    });
  }

  /**
   * Update goal progress based on actual campaign metrics
   */
  async updateProgress(organizationId: string, goalId: string, currentValue: number) {
    const goal = await this.findOne(goalId, organizationId);

    await this.prisma.campaignGoal.update({
      where: { id: goalId },
      data: { currentValue },
    });

    // Check if goal is achieved
    if (currentValue >= Number(goal.targetValue)) {
      await this.eventsService.publish(EventType.CAMPAIGN_COMPLETED, {
        organizationId,
        entityType: 'campaign_goal',
        entityId: goalId,
        data: { goalId, achieved: true },
      });
    }

    return goal;
  }

  /**
   * Get goals with progress tracking based on campaign metrics
   */
  async getGoalsWithProgress(organizationId: string, campaignId?: string) {
    const goals = await this.findAll(organizationId, campaignId);

    // Calculate actual progress for each goal
    return Promise.all(
      goals.map(async (goal: any) => {
        let actualValue = 0;

        switch (goal.goalType) {
          case 'replies_target':
            actualValue = await this.prisma.campaignMessage.count({
              where: {
                campaignId: goal.campaignId,
                status: 'replied',
              },
            });
            break;
          case 'opens_target':
            // TODO: track email opens
            actualValue = 0;
            break;
          case 'clicks_target':
            // TODO: track link clicks
            actualValue = 0;
            break;
          case 'meetings_target':
            // TODO: integrate with calendar
            actualValue = 0;
            break;
        }

        return {
          ...goal,
          actualValue,
          progress: goal.targetValue > 0 ? (actualValue / Number(goal.targetValue)) * 100 : 0,
        };
      }),
    );
  }
}

