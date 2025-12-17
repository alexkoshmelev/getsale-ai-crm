import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  async create(organizationId: string, userId: string, createDto: CreateMessageDto) {
    // Verify chat belongs to organization
    const chat = await this.prisma.chat.findFirst({
      where: {
        id: createDto.chatId,
        organizationId,
      },
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

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
}

