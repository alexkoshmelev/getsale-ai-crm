import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { TelegramService } from '../telegram/telegram.service';
import { WebSocketGateway } from '../websocket/websocket.gateway';
import { EventsService, EventType } from '../events/events.service';

export enum NotificationType {
  MESSAGE_RECEIVED = 'message.received',
  DEAL_STAGE_CHANGED = 'deal.stage.changed',
  CAMPAIGN_COMPLETED = 'campaign.completed',
  PAYMENT_FAILED = 'payment.failed',
  AI_ALERT = 'ai.alert',
}

export interface NotificationData {
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: any;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    @Inject(forwardRef(() => TelegramService))
    private telegramService: TelegramService,
    private websocketGateway: WebSocketGateway,
    private eventsService: EventsService,
  ) {}

  async create(
    organizationId: string,
    userId: string,
    data: NotificationData,
  ) {
    const notification = await this.prisma.notification.create({
      data: {
        organizationId,
        userId,
        type: data.type,
        title: data.title,
        message: data.message,
        metadata: data.metadata || {},
        isRead: false,
      },
    });

    // Send via WebSocket
    this.websocketGateway.sendNotification(userId, notification);

    // Get user preferences
    const preferences = await this.getUserPreferences(userId, organizationId);

    // Send via email if enabled
    if (preferences.email) {
      try {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (user?.email) {
          await this.emailService.sendEmail(
            user.email,
            data.title,
            data.message,
            undefined,
            organizationId,
          );
        }
      } catch (error) {
        this.logger.error('Failed to send email notification', error);
      }
    }

    // Send via Telegram if enabled
    if (preferences.telegram) {
      // Find user's Telegram connection
      const connection = await this.prisma.oauthConnection.findFirst({
        where: {
          userId,
          provider: 'telegram',
        },
      });

      if (connection?.providerUserId) {
        try {
          await this.telegramService.sendMessage(
            connection.providerUserId,
            `🔔 ${data.title}\n\n${data.message}`,
          );
        } catch (error) {
          this.logger.error('Failed to send Telegram notification', error);
        }
      }
    }

    return notification;
  }

  async findAll(userId: string, organizationId: string, unreadOnly = false) {
    const where: any = {
      userId,
      organizationId,
    };

    if (unreadOnly) {
      where.isRead = false;
    }

    return this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markAsRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        id,
        userId,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  async markAllAsRead(userId: string, organizationId: string) {
    return this.prisma.notification.updateMany({
      where: {
        userId,
        organizationId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  async getPreferences(userId: string, organizationId: string) {
    return this.getUserPreferences(userId, organizationId);
  }

  async updatePreferences(
    userId: string,
    organizationId: string,
    preferences: any,
  ) {
    // Store in user settings or separate table
    // For now, using metadata in organization_members
    const member = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
    });

    if (member) {
      // Store in organization settings or user metadata
      // This is a simplified version - in production, use a separate preferences table
    }

    return preferences;
  }

  private async getUserPreferences(userId: string, organizationId: string) {
    // Default preferences
    return {
      email: true,
      telegram: false,
      inApp: true,
    };
  }

  // Event handlers
  async handleMessageReceived(organizationId: string, userId: string, data: any) {
    await this.create(organizationId, userId, {
      type: NotificationType.MESSAGE_RECEIVED,
      title: 'New Message',
      message: `You have a new message from ${data.contactName || 'contact'}`,
      link: `/dashboard/chats/${data.chatId}`,
      metadata: data,
    });
  }

  async handleDealStageChanged(organizationId: string, userId: string, data: any) {
    await this.create(organizationId, userId, {
      type: NotificationType.DEAL_STAGE_CHANGED,
      title: 'Deal Updated',
      message: `Deal "${data.dealName}" moved to ${data.newStage}`,
      link: `/dashboard/pipelines?dealId=${data.dealId}`,
      metadata: data,
    });
  }
}

