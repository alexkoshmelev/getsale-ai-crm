import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { EventsService, EventType } from '../events/events.service';

@Injectable()
export class SupervisorService {
  private readonly logger = new Logger(SupervisorService.name);

  constructor(
    private prisma: PrismaService,
    private eventsService: EventsService,
  ) {}

  /**
   * Check if user has supervisor role
   */
  async isSupervisor(organizationId: string, userId: string): Promise<boolean> {
    const member = await this.prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId,
        role: { in: ['owner', 'admin', 'supervisor'] },
      },
    });

    return !!member;
  }

  /**
   * Get all chats (supervisor view)
   */
  async getAllChats(organizationId: string, filters?: { bidiId?: string; isUnread?: boolean }) {
    const where: any = { organizationId };

    if (filters?.bidiId) {
      where.assignments = {
        some: { bidiId: filters.bidiId },
      };
    }

    if (filters?.isUnread !== undefined) {
      where.isUnread = filters.isUnread;
    }

    return this.prisma.chat.findMany({
      where,
      include: {
        contact: {
          include: {
            company: true,
            assignments: {
              include: {
                bidi: {
                  include: {
                    user: true,
                  },
                },
              },
            },
          },
        },
        assignments: {
          include: {
            bidi: {
              include: {
                user: true,
              },
            },
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });
  }

  /**
   * Get BiDi replies for review
   */
  async getBidiReplies(organizationId: string, bidiId?: string, limit = 50) {
    const where: any = {
      organizationId,
      senderType: 'user',
      isIncoming: false,
    };

    if (bidiId) {
      where.chat = {
        assignments: {
          some: { bidiId },
        },
      };
    }

    return this.prisma.message.findMany({
      where,
      include: {
        chat: {
          include: {
            contact: true,
            assignments: {
              include: {
                bidi: {
                  include: {
                    user: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get AI messages for review
   */
  async getAIMessages(organizationId: string, limit = 50) {
    return this.prisma.message.findMany({
      where: {
        organizationId,
        senderType: 'ai_agent',
      },
      include: {
        chat: {
          include: {
            contact: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Take over chat (supervisor mode)
   */
  async takeOverChat(
    organizationId: string,
    chatId: string,
    supervisorId: string,
  ) {
    // Verify supervisor
    if (!(await this.isSupervisor(organizationId, supervisorId))) {
      throw new ForbiddenException('Supervisor access required');
    }

    // Assign chat to supervisor
    const assignment = await this.prisma.chatAssignment.upsert({
      where: {
        chatId_bidiId: {
          chatId,
          bidiId: supervisorId, // Using supervisorId as bidiId for assignment
        },
      },
      create: {
        organizationId,
        chatId,
        bidiId: supervisorId,
        assignedBy: supervisorId,
      },
      update: {
        assignedAt: new Date(),
        assignedBy: supervisorId,
      },
    });

    await this.eventsService.publish(EventType.MESSAGE_RECEIVED, {
      organizationId,
      entityType: 'chat',
      entityId: chatId,
      data: { action: 'takeover', supervisorId },
    });

    return assignment;
  }

  /**
   * Override AI decision
   */
  async overrideAIDecision(
    organizationId: string,
    messageId: string,
    supervisorId: string,
    overrideReason: string,
  ) {
    if (!(await this.isSupervisor(organizationId, supervisorId))) {
      throw new ForbiddenException('Supervisor access required');
    }

    const message = await this.prisma.message.findFirst({
      where: { id: messageId, organizationId },
    });

    if (!message) {
      throw new ForbiddenException('Message not found');
    }

    // Log override
    await this.eventsService.publish(EventType.AI_DRAFT_APPROVED, {
      organizationId,
      entityType: 'message',
      entityId: messageId,
      data: {
        action: 'override',
        supervisorId,
        overrideReason,
        originalMessage: message.content,
      },
    });

    return { success: true };
  }

  /**
   * Get audit trail for chat
   */
  async getChatAuditTrail(organizationId: string, chatId: string) {
    const messages = await this.prisma.message.findMany({
      where: {
        chatId,
        organizationId,
      },
      include: {
        chat: {
          include: {
            assignments: {
              include: {
                bidi: {
                  include: {
                    user: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return messages.map((msg) => ({
      id: msg.id,
      timestamp: msg.createdAt,
      senderType: msg.senderType,
      senderId: msg.senderId,
      content: msg.content,
      assignedTo: msg.chat.assignments[0]?.bidi?.user?.name || 'Unassigned',
    }));
  }
}

