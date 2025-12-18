import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { EventsService, EventType } from '../events/events.service';
import { DealsService } from '../deals/deals.service';

@Injectable()
export class PipelineAutoTransitionService {
  private readonly logger = new Logger(PipelineAutoTransitionService.name);

  constructor(
    private prisma: PrismaService,
    private eventsService: EventsService,
    private dealsService: DealsService,
  ) {
    this.setupEventSubscriptions();
  }

  /**
   * Setup event subscriptions for auto-transitions
   */
  private setupEventSubscriptions() {
    // Subscribe to relevant events
    this.eventsService.subscribe('global', async (event) => {
      if (event.type === EventType.MESSAGE_RECEIVED) {
        await this.handleMessageReceived(event);
      } else if (event.type === EventType.CAMPAIGN_REPLY) {
        await this.handleCampaignReply(event);
      } else if (event.type === EventType.MEETING_BOOKED) {
        await this.handleMeetingBooked(event);
      }
    });
  }

  /**
   * Handle message received event for auto-transitions
   */
  private async handleMessageReceived(event: any) {
    const { organizationId, data } = event;
    const { contactId, chatId } = data;

    if (!contactId) {
      return;
    }

    // Get active pipeline policies for this organization
    const policies = await this.prisma.pipelinePolicy.findMany({
      where: {
        organizationId,
        isActive: true,
        policyType: 'auto_transition',
        triggerEvent: EventType.MESSAGE_RECEIVED,
      },
      include: {
        pipeline: {
          include: {
            stages: true,
          },
        },
      },
    });

    for (const policy of policies) {
      try {
        if (await this.matchPolicyConditions(policy, { contactId, chatId })) {
          await this.executeAutoTransition(policy, contactId, organizationId);
        }
      } catch (error) {
        this.logger.error(`Failed to process auto-transition policy ${policy.id}`, error);
      }
    }
  }

  /**
   * Handle campaign reply event
   */
  private async handleCampaignReply(event: any) {
    const { organizationId, data } = event;
    const { contactId } = data;

    if (!contactId) {
      return;
    }

    const policies = await this.prisma.pipelinePolicy.findMany({
      where: {
        organizationId,
        isActive: true,
        policyType: 'auto_transition',
        triggerEvent: EventType.CAMPAIGN_REPLY,
      },
      include: {
        pipeline: {
          include: {
            stages: true,
          },
        },
      },
    });

    for (const policy of policies) {
      try {
        if (await this.matchPolicyConditions(policy, { contactId })) {
          await this.executeAutoTransition(policy, contactId, organizationId);
        }
      } catch (error) {
        this.logger.error(`Failed to process auto-transition policy ${policy.id}`, error);
      }
    }
  }

  /**
   * Handle meeting booked event
   */
  private async handleMeetingBooked(event: any) {
    const { organizationId, data } = event;
    const { contactId } = data;

    if (!contactId) {
      return;
    }

    const policies = await this.prisma.pipelinePolicy.findMany({
      where: {
        organizationId,
        isActive: true,
        policyType: 'auto_transition',
        triggerEvent: EventType.MEETING_BOOKED,
      },
      include: {
        pipeline: {
          include: {
            stages: true,
          },
        },
      },
    });

    for (const policy of policies) {
      try {
        if (await this.matchPolicyConditions(policy, { contactId })) {
          await this.executeAutoTransition(policy, contactId, organizationId);
        }
      } catch (error) {
        this.logger.error(`Failed to process auto-transition policy ${policy.id}`, error);
      }
    }
  }

  /**
   * Match policy conditions
   */
  private async matchPolicyConditions(policy: any, eventData: any): Promise<boolean> {
    const conditions = policy.conditions as any;

    if (!conditions || Object.keys(conditions).length === 0) {
      return true; // No conditions, always match
    }

    // Check contact conditions
    if (conditions.contactTags) {
      const contact = await this.prisma.contact.findUnique({
        where: { id: eventData.contactId },
        select: { tags: true },
      });

      if (!contact || !conditions.contactTags.some((tag: string) => contact.tags.includes(tag))) {
        return false;
      }
    }

    // Check deal stage conditions
    if (conditions.currentStage) {
      const deal = await this.prisma.deal.findFirst({
        where: {
          contactId: eventData.contactId,
          pipelineId: policy.pipelineId,
        },
        include: { stage: true },
      });

      if (!deal || deal.stage?.name !== conditions.currentStage) {
        return false;
      }
    }

    return true;
  }

  /**
   * Execute auto-transition based on policy
   */
  private async executeAutoTransition(policy: any, contactId: string, organizationId: string) {
    const actions = policy.actions as any;

    if (!actions || !actions.targetStage) {
      this.logger.warn(`Policy ${policy.id} has no target stage defined`);
      return;
    }

    // Find deal for this contact in the policy's pipeline
    const deal = await this.prisma.deal.findFirst({
      where: {
        contactId,
        pipelineId: policy.pipelineId,
        organizationId,
      },
      include: {
        stage: true,
      },
    });

    if (!deal) {
      this.logger.warn(`No deal found for contact ${contactId} in pipeline ${policy.pipelineId}`);
      return;
    }

    // Find target stage
    const targetStage = await this.prisma.pipelineStage.findFirst({
      where: {
        pipelineId: policy.pipelineId,
        name: actions.targetStage,
      },
    });

    if (!targetStage) {
      this.logger.warn(`Target stage ${actions.targetStage} not found in pipeline ${policy.pipelineId}`);
      return;
    }

    // Check if already in target stage
    if (deal.stageId === targetStage.id) {
      return; // Already in target stage
    }

    // Execute transition
    await this.dealsService.updateStage(deal.id, organizationId, targetStage.id);

    this.logger.log(
      `Auto-transitioned deal ${deal.id} from ${deal.stage?.name} to ${targetStage.name} via policy ${policy.id}`,
    );

    // Execute stage entry actions if defined
    if (actions.onEntry) {
      await this.executeStageActions(actions.onEntry, deal.id, organizationId);
    }
  }

  /**
   * Execute stage entry/exit actions
   */
  private async executeStageActions(actions: any, dealId: string, organizationId: string) {
    if (actions.notify) {
      // TODO: Send notification
      this.logger.log(`Notification action for deal ${dealId}`);
    }

    if (actions.createTask) {
      // TODO: Create task
      this.logger.log(`Create task action for deal ${dealId}`);
    }

    if (actions.updateFields) {
      // Update deal fields
      await this.prisma.deal.update({
        where: { id: dealId },
        data: actions.updateFields,
      });
    }
  }
}

