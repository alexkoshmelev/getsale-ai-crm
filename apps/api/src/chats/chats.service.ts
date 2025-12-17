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
}

