import { Injectable, Logger, ModuleRef } from '@nestjs/common';
import { RedisService } from '../common/redis/redis.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { TriggersService } from '../triggers/triggers.service';
import { CampaignsService } from '../campaigns/campaigns.service';

export enum EventType {
  // Contact events
  CONTACT_CREATED = 'contact.created',
  CONTACT_UPDATED = 'contact.updated',
  CONTACT_DELETED = 'contact.deleted',

  // Deal events
  DEAL_CREATED = 'deal.created',
  DEAL_UPDATED = 'deal.updated',
  DEAL_STAGE_CHANGED = 'deal.stage.changed',
  DEAL_DELETED = 'deal.deleted',

  // Message events
  MESSAGE_RECEIVED = 'message.received',
  MESSAGE_SENT = 'message.sent',

  // Campaign events
  CAMPAIGN_STARTED = 'campaign.started',
  CAMPAIGN_PAUSED = 'campaign.paused',
  CAMPAIGN_STOPPED = 'campaign.stopped',
  CAMPAIGN_COMPLETED = 'campaign.completed',
  CAMPAIGN_REPLY = 'campaign.reply',

  // AI events
  AI_AGENT_TRIGGERED = 'ai.agent.triggered',
  AI_DRAFT_GENERATED = 'ai.draft.generated',
  AI_DRAFT_APPROVED = 'ai.draft.approved',

  // Meeting events
  MEETING_BOOKED = 'meeting.booked',

  // Billing events
  BILLING_SUBSCRIPTION_UPDATED = 'billing.subscription.updated',
  BILLING_PAYMENT_FAILED = 'billing.payment.failed',
}

export interface EventPayload {
  organizationId: string;
  entityType?: string;
  entityId?: string;
  userId?: string;
  agentId?: string;
  data: any;
}

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    private redis: RedisService,
    private prisma: PrismaService,
    private moduleRef: ModuleRef,
  ) {}

  async publish(eventType: EventType, payload: EventPayload) {
    const event = {
      type: eventType,
      timestamp: new Date().toISOString(),
      ...payload,
    };

    try {
      // Publish to Redis channel
      const channel = `org:${payload.organizationId}:events`;
      await this.redis.getClient().publish(channel, JSON.stringify(event));

      // Store in database for event sourcing
      await this.prisma.event.create({
        data: {
          organizationId: payload.organizationId,
          eventType: eventType,
          entityType: payload.entityType,
          entityId: payload.entityId,
          userId: payload.userId,
          agentId: payload.agentId,
          payload: payload.data,
        },
      });

      this.logger.debug(`Event published: ${eventType}`, { organizationId: payload.organizationId });

      // Execute triggers asynchronously (don't block event publishing)
      try {
        const triggersService = this.moduleRef.get(TriggersService, { strict: false });
        if (triggersService) {
          triggersService
            .executeTriggersForEvent(payload.organizationId, eventType, {
              entityType: payload.entityType,
              entityId: payload.entityId,
              userId: payload.userId,
              agentId: payload.agentId,
              ...payload.data,
            })
            .catch((error: any) => {
              this.logger.error(`Failed to execute triggers for event: ${eventType}`, error);
            });
        }
      } catch (error) {
        // TriggersService not available, skip
      }

      // Handle campaign reply detection for message.received events
      if (eventType === EventType.MESSAGE_RECEIVED && payload.data?.contactId && payload.data?.chatId) {
        try {
          const campaignsService = this.moduleRef.get(CampaignsService, { strict: false });
          if (campaignsService) {
            campaignsService
              .handleMessageReceived(payload.organizationId, payload.data.contactId, payload.data.chatId)
              .catch((error: any) => {
                this.logger.error('Failed to detect campaign reply', error);
              });
          }
        } catch (error) {
          // CampaignsService not available, skip
        }
      }
    } catch (error) {
      this.logger.error(`Failed to publish event: ${eventType}`, error);
      throw error;
    }
  }

  async subscribe(organizationId: string, callback: (event: any) => void) {
    const channel = `org:${organizationId}:events`;
    const subscriber = this.redis.getClient().duplicate();

    await subscriber.subscribe(channel);
    subscriber.on('message', (ch, message) => {
      try {
        const event = JSON.parse(message);
        callback(event);
      } catch (error) {
        this.logger.error('Failed to parse event message', error);
      }
    });

    return () => subscriber.unsubscribe(channel);
  }

  async getEvents(
    organizationId: string,
    eventType?: string,
    entityType?: string,
    limit = 100,
  ) {
    const where: any = { organizationId };
    if (eventType) {
      where.eventType = eventType;
    }
    if (entityType) {
      where.entityType = entityType;
    }

    return this.prisma.event.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}

