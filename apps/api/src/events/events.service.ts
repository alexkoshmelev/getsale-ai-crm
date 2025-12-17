import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../common/redis/redis.service';
import { PrismaService } from '../common/prisma/prisma.service';

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

  // AI events
  AI_AGENT_TRIGGERED = 'ai.agent.triggered',
  AI_DRAFT_GENERATED = 'ai.draft.generated',

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

