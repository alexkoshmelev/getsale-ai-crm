import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import axios from 'axios';

interface TelegramMessage {
  message_id: number;
  from: {
    id: number;
    username?: string;
    first_name?: string;
    last_name?: string;
  };
  chat: {
    id: number;
    type: string;
    username?: string;
    first_name?: string;
    last_name?: string;
  };
  text?: string;
  date: number;
}

@Injectable()
export class TelegramService implements OnModuleInit {
  private readonly logger = new Logger(TelegramService.name);
  private botToken: string;
  private apiUrl: string;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN') || '';
    this.apiUrl = `https://api.telegram.org/bot${this.botToken}`;
  }

  async onModuleInit() {
    if (this.botToken) {
      this.logger.log('Telegram bot initialized');
      // Set webhook on startup
      // await this.setWebhook();
    } else {
      this.logger.warn('TELEGRAM_BOT_TOKEN not configured');
    }
  }

  async setWebhook(url: string) {
    try {
      const response = await axios.post(`${this.apiUrl}/setWebhook`, {
        url,
      });
      this.logger.log(`Webhook set: ${url}`);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to set webhook', error);
      throw error;
    }
  }

  async handleWebhook(update: any) {
    if (update.message) {
      await this.handleMessage(update.message);
    }
  }

  private async handleMessage(message: TelegramMessage) {
    try {
      const chatId = message.chat.id;
      const userId = message.from.id;
      const text = message.text || '';

      // Find or create contact by telegram_chat_id
      const contact = await this.prisma.contact.findFirst({
        where: {
          telegramChatId: BigInt(chatId),
        },
        include: {
          organization: true,
        },
      });

      if (!contact) {
        this.logger.warn(`Contact not found for chat ${chatId}`);
        // Could create contact here or send message to user
        return;
      }

      // Find or create chat
      let chat = await this.prisma.chat.findFirst({
        where: {
          organizationId: contact.organizationId,
          contactId: contact.id,
          channel: 'telegram',
          channelThreadId: chatId.toString(),
        },
      });

      if (!chat) {
        chat = await this.prisma.chat.create({
          data: {
            organizationId: contact.organizationId,
            contactId: contact.id,
            channel: 'telegram',
            channelThreadId: chatId.toString(),
            title: message.chat.first_name || message.chat.username || 'Telegram Chat',
          },
        });
      }

      // Create incoming message
      await this.prisma.message.create({
        data: {
          chatId: chat.id,
          organizationId: contact.organizationId,
          senderType: 'contact',
          senderId: contact.id,
          content: text,
          isIncoming: true,
        },
      });

      // Update chat last message time
      await this.prisma.chat.update({
        where: { id: chat.id },
        data: {
          lastMessageAt: new Date(),
          isUnread: true,
        },
      });

      this.logger.log(`Message saved: ${message.message_id}`);
    } catch (error) {
      this.logger.error('Error handling message', error);
    }
  }

  async sendMessage(chatId: string, text: string) {
    try {
      const response = await axios.post(`${this.apiUrl}/sendMessage`, {
        chat_id: chatId,
        text,
      });
      return response.data;
    } catch (error) {
      this.logger.error('Failed to send message', error);
      throw error;
    }
  }

  async sendMessageToContact(contactId: string, organizationId: string, text: string) {
    const contact = await this.prisma.contact.findFirst({
      where: {
        id: contactId,
        organizationId,
      },
    });

    if (!contact || !contact.telegramChatId) {
      throw new Error('Contact not found or no Telegram chat ID');
    }

    // Send via Telegram API
    const telegramResponse = await this.sendMessage(
      contact.telegramChatId.toString(),
      text,
    );

    // Find or create chat
    let chat = await this.prisma.chat.findFirst({
      where: {
        organizationId,
        contactId: contact.id,
        channel: 'telegram',
        channelThreadId: contact.telegramChatId.toString(),
      },
    });

    if (!chat) {
      chat = await this.prisma.chat.create({
        data: {
          organizationId,
          contactId: contact.id,
          channel: 'telegram',
          channelThreadId: contact.telegramChatId.toString(),
          title: contact.firstName || contact.email || 'Telegram Chat',
        },
      });
    }

    // Save message to database
    const message = await this.prisma.message.create({
      data: {
        chatId: chat.id,
        organizationId,
        senderType: 'user',
        content: text,
        isIncoming: false,
      },
    });

    // Update chat
    await this.prisma.chat.update({
      where: { id: chat.id },
      data: {
        lastMessageAt: new Date(),
        isUnread: false,
      },
    });

    return message;
  }
}

