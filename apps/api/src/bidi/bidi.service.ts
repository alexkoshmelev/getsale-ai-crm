import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { EventsService, EventType } from '../events/events.service';

@Injectable()
export class BidiService {
  private readonly logger = new Logger(BidiService.name);

  constructor(
    private prisma: PrismaService,
    private eventsService: EventsService,
  ) {}

  /**
   * Get BiDi dashboard data (workload, performance, targets)
   */
  async getDashboard(organizationId: string, bidiId?: string) {
    const where: any = {
      organizationId,
      role: 'bidi',
      isActive: true,
    };

    if (bidiId) {
      where.id = bidiId;
    }

    const bidis = await this.prisma.organizationMember.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            assignedContacts: true,
            assignedChats: true,
          },
        },
      },
    });

    // Get performance data for each BiDi
    const dashboard = await Promise.all(
      bidis.map(async (bidi) => {
        const currentPeriod = this.getCurrentPeriod();
        const performance = await this.getPerformance(bidi.id, currentPeriod.start, currentPeriod.end);

        return {
          id: bidi.id,
          user: bidi.user,
          bidiType: bidi.bidiType,
          ownership: bidi.ownership,
          targets: {
            replies: bidi.targetReplies,
            meetings: bidi.targetMeetings,
            revenue: bidi.targetRevenue,
          },
          workload: {
            contacts: bidi._count.assignedContacts,
            chats: bidi._count.assignedChats,
          },
          performance,
        };
      }),
    );

    return dashboard;
  }

  /**
   * Assign contact to BiDi
   */
  async assignContact(
    organizationId: string,
    contactId: string,
    bidiId: string,
    assignedBy: string,
  ) {
    // Verify contact and BiDi belong to organization
    const [contact, bidi] = await Promise.all([
      this.prisma.contact.findFirst({
        where: { id: contactId, organizationId },
      }),
      this.prisma.organizationMember.findFirst({
        where: { id: bidiId, organizationId, role: 'bidi' },
      }),
    ]);

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }
    if (!bidi) {
      throw new NotFoundException('BiDi not found');
    }

    // Create or update assignment
    const assignment = await this.prisma.contactAssignment.upsert({
      where: {
        contactId_bidiId: {
          contactId,
          bidiId,
        },
      },
      create: {
        organizationId,
        contactId,
        bidiId,
        assignedBy,
      },
      update: {
        assignedAt: new Date(),
        assignedBy,
      },
    });

    await this.eventsService.publish(EventType.CONTACT_UPDATED, {
      organizationId,
      entityType: 'contact',
      entityId: contactId,
      data: { assignedTo: bidiId },
    });

    return assignment;
  }

  /**
   * Assign chat to BiDi
   */
  async assignChat(
    organizationId: string,
    chatId: string,
    bidiId: string,
    assignedBy: string,
  ) {
    const [chat, bidi] = await Promise.all([
      this.prisma.chat.findFirst({
        where: { id: chatId, organizationId },
      }),
      this.prisma.organizationMember.findFirst({
        where: { id: bidiId, organizationId, role: 'bidi' },
      }),
    ]);

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }
    if (!bidi) {
      throw new NotFoundException('BiDi not found');
    }

    const assignment = await this.prisma.chatAssignment.upsert({
      where: {
        chatId_bidiId: {
          chatId,
          bidiId,
        },
      },
      create: {
        organizationId,
        chatId,
        bidiId,
        assignedBy,
      },
      update: {
        assignedAt: new Date(),
        assignedBy,
      },
    });

    return assignment;
  }

  /**
   * Get BiDi performance metrics
   */
  async getPerformance(bidiId: string, startDate: Date, endDate: Date) {
    // Get or create performance log
    let log = await this.prisma.bidiPerformanceLog.findUnique({
      where: {
        bidiId_periodStart: {
          bidiId,
          periodStart: startDate,
        },
      },
    });

    if (!log) {
      // Calculate current metrics
      const bidi = await this.prisma.organizationMember.findUnique({
        where: { id: bidiId },
        include: {
          assignedChats: {
            include: {
              chat: {
                include: {
                  messages: {
                    where: {
                      createdAt: { gte: startDate, lte: endDate },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!bidi) {
        throw new NotFoundException('BiDi not found');
      }

      const messagesSent = await this.prisma.message.count({
        where: {
          organizationId: bidi.organizationId,
          senderId: bidi.userId,
          senderType: 'user',
          createdAt: { gte: startDate, lte: endDate },
        },
      });

      const replies = await this.prisma.message.count({
        where: {
          organizationId: bidi.organizationId,
          chat: {
            assignments: {
              some: { bidiId },
            },
          },
          isIncoming: true,
          createdAt: { gte: startDate, lte: endDate },
        },
      });

      const deals = await this.prisma.deal.count({
        where: {
          organizationId: bidi.organizationId,
          contact: {
            assignments: {
              some: { bidiId },
            },
          },
          updatedAt: { gte: startDate, lte: endDate },
        },
      });

      const revenue = await this.prisma.deal.aggregate({
        where: {
          organizationId: bidi.organizationId,
          contact: {
            assignments: {
              some: { bidiId },
            },
          },
          updatedAt: { gte: startDate, lte: endDate },
        },
        _sum: {
          value: true,
        },
      });

      const metrics = {
        messagesSent,
        replies,
        meetings: 0, // TODO: integrate with calendar
        deals,
        revenue: revenue._sum.value || 0,
      };

      const targets = {
        targetReplies: bidi.targetReplies,
        targetMeetings: bidi.targetMeetings,
        targetRevenue: bidi.targetRevenue,
      };

      log = await this.prisma.bidiPerformanceLog.create({
        data: {
          organizationId: bidi.organizationId,
          bidiId,
          periodStart: startDate,
          periodEnd: endDate,
          metrics,
          targets,
        },
      });
    }

    return {
      metrics: log.metrics as any,
      targets: log.targets as any,
      period: {
        start: log.periodStart,
        end: log.periodEnd,
      },
    };
  }

  /**
   * Get BiDi workload (contacts and chats assigned)
   */
  async getWorkload(bidiId: string) {
    const [contacts, chats] = await Promise.all([
      this.prisma.contactAssignment.findMany({
        where: { bidiId },
        include: {
          contact: {
            include: {
              company: true,
              chats: {
                take: 1,
                orderBy: { lastMessageAt: 'desc' },
              },
            },
          },
        },
      }),
      this.prisma.chatAssignment.findMany({
        where: { bidiId },
        include: {
          chat: {
            include: {
              contact: true,
              messages: {
                take: 1,
                orderBy: { createdAt: 'desc' },
              },
            },
          },
        },
      }),
    ]);

    return {
      contacts: contacts.map((a) => a.contact),
      chats: chats.map((a) => a.chat),
    };
  }

  /**
   * Update BiDi targets
   */
  async updateTargets(
    organizationId: string,
    bidiId: string,
    targets: {
      targetReplies?: number;
      targetMeetings?: number;
      targetRevenue?: number;
    },
  ) {
    const bidi = await this.prisma.organizationMember.findFirst({
      where: { id: bidiId, organizationId, role: 'bidi' },
    });

    if (!bidi) {
      throw new NotFoundException('BiDi not found');
    }

    return this.prisma.organizationMember.update({
      where: { id: bidiId },
      data: targets,
    });
  }

  private getCurrentPeriod() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    return { start, end };
  }
}

