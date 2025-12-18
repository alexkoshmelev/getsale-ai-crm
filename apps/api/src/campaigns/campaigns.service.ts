import { Injectable, NotFoundException, BadRequestException, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { EventsService, EventType } from '../events/events.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../common/redis/redis.service';

@Injectable()
export class CampaignsService implements OnModuleInit {
  private readonly logger = new Logger(CampaignsService.name);
  private campaignQueue: Queue;

  constructor(
    private prisma: PrismaService,
    private eventsService: EventsService,
    private configService: ConfigService,
    private redis: RedisService,
  ) {
    // Initialize BullMQ queue
    this.campaignQueue = new Queue('campaigns', {
      connection: this.redis.getClient() as any,
    });
  }

  async onModuleInit() {
    // Subscribe to message.received events for campaign reply detection
    // This will be handled per-organization when they connect
  }

  /**
   * Handle message received event to detect campaign replies
   * Called by event handlers
   */
  async handleMessageReceived(organizationId: string, contactId: string, chatId: string) {
    try {
      // Find active campaign messages for this contact
      const campaignMessages = await this.prisma.campaignMessage.findMany({
        where: {
          contactId,
          status: { in: ['sent', 'delivered'] },
          campaign: {
            organizationId,
            status: 'active',
          },
        },
        include: {
          campaign: true,
        },
        orderBy: { sentAt: 'desc' },
        take: 1,
      });

      if (campaignMessages.length === 0) {
        return null;
      }

      const campaignMessage = campaignMessages[0];

      // Mark as replied
      await this.prisma.campaignMessage.update({
        where: { id: campaignMessage.id },
        data: {
          status: 'replied',
          repliedAt: new Date(),
        },
      });

      // Publish campaign reply event
      await this.eventsService.publish(EventType.CAMPAIGN_REPLY, {
        organizationId,
        entityType: 'campaign_message',
        entityId: campaignMessage.id,
        data: {
          campaignId: campaignMessage.campaignId,
          contactId,
          chatId,
          campaignMessageId: campaignMessage.id,
        },
      });

      // Stop campaign sequence for this contact (mark other pending messages as skipped)
      await this.prisma.campaignMessage.updateMany({
        where: {
          campaignId: campaignMessage.campaignId,
          contactId,
          status: 'pending',
        },
        data: {
          status: 'skipped',
        },
      });

      return campaignMessage;
    } catch (error) {
      this.logger.error('Failed to detect campaign reply', error);
      return null;
    }
  }

  async create(organizationId: string, createDto: CreateCampaignDto) {
    const campaign = await this.prisma.campaign.create({
      data: {
        ...createDto,
        organizationId,
        status: 'draft',
      },
    });

    await this.eventsService.publish(EventType.CAMPAIGN_STARTED, {
      organizationId,
      entityType: 'campaign',
      entityId: campaign.id,
      data: { campaign },
    });

    return campaign;
  }

  async findAll(organizationId: string) {
    return this.prisma.campaign.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });
  }

  async findOne(id: string, organizationId: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        messages: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            contact: true,
          },
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    return campaign;
  }

  async update(id: string, organizationId: string, updateDto: UpdateCampaignDto) {
    await this.findOne(id, organizationId); // Check exists

    return this.prisma.campaign.update({
      where: { id },
      data: updateDto,
    });
  }

  async start(id: string, organizationId: string) {
    const campaign = await this.findOne(id, organizationId);

    if (campaign.status !== 'draft' && campaign.status !== 'paused') {
      throw new BadRequestException('Campaign can only be started from draft or paused status');
    }

    // Update status
    await this.prisma.campaign.update({
      where: { id },
      data: {
        status: 'active',
        startDate: new Date(),
      },
    });

    // Get target contacts
    const contacts = await this.getTargetContacts(organizationId, campaign.targetAudience as any);

    // Add jobs to queue
    for (const contact of contacts) {
      await this.campaignQueue.add(
        'send-campaign-message',
        {
          campaignId: campaign.id,
          contactId: contact.id,
          organizationId,
          messageTemplate: campaign.messageTemplate,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      );
    }

    await this.eventsService.publish(EventType.CAMPAIGN_STARTED, {
      organizationId,
      entityType: 'campaign',
      entityId: campaign.id,
      data: { campaign, contactsCount: contacts.length },
    });

    return { message: 'Campaign started', contactsCount: contacts.length };
  }

  async pause(id: string, organizationId: string) {
    const campaign = await this.findOne(id, organizationId);

    await this.prisma.campaign.update({
      where: { id },
      data: { status: 'paused' },
    });

    await this.eventsService.publish(EventType.CAMPAIGN_PAUSED, {
      organizationId,
      entityType: 'campaign',
      entityId: campaign.id,
      data: { campaign },
    });

    return campaign;
  }

  async stop(id: string, organizationId: string) {
    const campaign = await this.findOne(id, organizationId);

    await this.prisma.campaign.update({
      where: { id },
      data: { status: 'completed', endDate: new Date() },
    });

    await this.eventsService.publish(EventType.CAMPAIGN_STOPPED, {
      organizationId,
      entityType: 'campaign',
      entityId: campaign.id,
      data: { campaign },
    });

    return campaign;
  }

  private async getTargetContacts(organizationId: string, filters: any) {
    const where: any = { organizationId };

    // Apply filters
    if (filters.tags && filters.tags.length > 0) {
      where.tags = { hasSome: filters.tags };
    }

    if (filters.companyIds && filters.companyIds.length > 0) {
      where.companyId = { in: filters.companyIds };
    }

    if (filters.stages && filters.stages.length > 0) {
      // Get contacts with deals in specific stages
      const deals = await this.prisma.deal.findMany({
        where: {
          organizationId,
          stage: {
            name: { in: filters.stages },
          },
        },
        select: { contactId: true },
      });
      const contactIds = deals.map((d) => d.contactId).filter(Boolean);
      if (contactIds.length > 0) {
        where.id = { in: contactIds };
      } else {
        return []; // No contacts match
      }
    }

    return this.prisma.contact.findMany({
      where,
      take: filters.limit || 1000,
    });
  }

  async remove(id: string, organizationId: string) {
    await this.findOne(id, organizationId); // Check exists

    return this.prisma.campaign.delete({
      where: { id },
    });
  }
}

