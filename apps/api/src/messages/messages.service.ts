import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { EventsService, EventType } from '../events/events.service';
import { WebSocketGateway } from '../websocket/websocket.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { UsageLimitsService } from '../billing/usage-limits.service';
import { TrustSafetyService } from '../trust-safety/trust-safety.service';
import { CreateMessageDto } from './dto/create-message.dto';

@Injectable()
export class MessagesService {
  constructor(
    private prisma: PrismaService,
    private telegramService: TelegramService,
    private eventsService: EventsService,
    private websocketGateway: WebSocketGateway,
    private notificationsService: NotificationsService,
    private usageLimitsService: UsageLimitsService,
    private trustSafetyService: TrustSafetyService,
  ) {}

  async create(organizationId: string, userId: string, createDto: CreateMessageDto) {
    // Check message limit
    await this.usageLimitsService.validateMessageLimit(organizationId);

    // Verify chat belongs to organization
    const chat = await this.prisma.chat.findFirst({
      where: {
        id: createDto.chatId,
        organizationId,
      },
      include: {
        contact: true,
      },
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    // Validate trust & safety (opt-out, blacklist, throttling)
    await this.trustSafetyService.validateMessageSend(
      organizationId,
      chat.contactId,
      chat.channel,
      chat.contact.email || undefined,
      chat.contact.phone || undefined,
    );

    const message = await this.prisma.message.create({
      data: {
        ...createDto,
        organizationId,
        senderType: 'user',
        senderId: userId,
        isIncoming: false,
      },
      include: {
        chat: {
          include: {
            contact: true,
          },
        },
      },
    });

    // Update chat last message time
    await this.prisma.chat.update({
      where: { id: chat.id },
      data: { lastMessageAt: new Date() },
    });

    // Send via Telegram if channel is telegram
    if (chat.channel === 'telegram' && chat.channelThreadId) {
      try {
        await this.telegramService.sendMessage(chat.channelThreadId, createDto.content);
      } catch (error) {
        // Log error but don't fail the request
        console.error('Failed to send Telegram message:', error);
      }
    }

    // Publish event
    await this.eventsService.publish(EventType.MESSAGE_SENT, {
      organizationId,
      entityType: 'message',
      entityId: message.id,
      userId,
      data: { chatId: chat.id, content: createDto.content },
    });

    // Broadcast via WebSocket
    this.websocketGateway.broadcastMessage(chat.id, message);

    return message;
  }

  async findAll(chatId: string, organizationId: string, page = 1, limit = 50) {
    // Verify chat belongs to organization
    const chat = await this.prisma.chat.findFirst({
      where: {
        id: chatId,
        organizationId,
      },
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { chatId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.message.count({
        where: { chatId },
      }),
    ]);

    return {
      data: data.reverse(), // Return in chronological order
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Detect if incoming message is a reply to a campaign
   * Called when a message is received
   */
  async detectCampaignReply(organizationId: string, contactId: string, chatId: string) {
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

      this.logger.log(`Campaign reply detected: ${campaignMessage.id}`);

      return campaignMessage;
    } catch (error) {
      this.logger.error('Failed to detect campaign reply', error);
      return null;
    }
  }
}

