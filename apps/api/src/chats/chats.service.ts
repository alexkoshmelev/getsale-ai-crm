import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class ChatsService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string) {
    return this.prisma.chat.findMany({
      where: { organizationId },
      include: {
        contact: {
          include: {
            company: true,
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

  async findOne(id: string, organizationId: string) {
    const chat = await this.prisma.chat.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        contact: {
          include: {
            company: true,
          },
        },
      },
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    return chat;
  }

  async markAsRead(id: string, organizationId: string) {
    await this.findOne(id, organizationId); // Check exists

    return this.prisma.chat.update({
      where: { id },
      data: { isUnread: false },
    });
  }

  /**
   * Get chat context (contact, company, deals, etc.)
   * Used for Chat Context Panel
   */
  async getContext(id: string, organizationId: string) {
    const chat = await this.findOne(id, organizationId);

    // Get contact with full details
    const contact = await this.prisma.contact.findUnique({
      where: { id: chat.contactId },
      include: {
        company: true,
        deals: {
          include: {
            stage: true,
            pipeline: true,
          },
          orderBy: { updatedAt: 'desc' },
          take: 5,
        },
        chats: {
          where: { id: { not: id } },
          take: 5,
          orderBy: { lastMessageAt: 'desc' },
        },
      },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    // Get recent messages count
    const messagesCount = await this.prisma.message.count({
      where: { chatId: id },
    });

    return {
      contact: {
        id: contact.id,
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        phone: contact.phone,
        role: contact.role,
        tags: contact.tags,
        notes: contact.notes,
        company: contact.company,
      },
      deals: contact.deals,
      otherChats: contact.chats,
      stats: {
        messagesCount,
        lastActivity: chat.lastMessageAt,
      },
    };
  }
}

