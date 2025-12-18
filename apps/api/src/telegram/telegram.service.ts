import { Injectable, Logger, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { EventsService, EventType } from '../events/events.service';
import { WebSocketGateway } from '../websocket/websocket.gateway';
import { NotificationsService } from '../notifications/notifications.service';
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
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService,
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
      // Check if it's a command
      if (update.message.text?.startsWith('/')) {
        await this.handleCommand(update.message);
      } else {
        await this.handleMessage(update.message);
      }
    } else if (update.callback_query) {
      await this.handleCallbackQuery(update.callback_query);
    }
  }

  private async handleCommand(message: TelegramMessage) {
    const command = message.text?.split(' ')[0];
    const chatId = message.chat.id;

    switch (command) {
      case '/start':
        await this.sendMessage(
          chatId.toString(),
          '👋 Welcome to GetSale AI CRM!\n\nI can help you manage your contacts and conversations.\n\nUse /help to see available commands.',
        );
        break;
      case '/help':
        await this.sendMessage(
          chatId.toString(),
          '📋 Available commands:\n\n' +
            '/start - Start the bot\n' +
            '/help - Show this help message\n' +
            '/status - Check your connection status\n' +
            '/contacts - View your contacts\n' +
            '/settings - Manage settings',
        );
        break;
      case '/status':
        await this.handleStatusCommand(message);
        break;
      case '/contacts':
        await this.handleContactsCommand(message);
        break;
      case '/settings':
        await this.handleSettingsCommand(message);
        break;
      default:
        await this.sendMessage(chatId.toString(), '❓ Unknown command. Use /help for available commands.');
    }
  }

  private async handleCallbackQuery(callbackQuery: any) {
    // Check if message exists (it may be absent for inline button callbacks)
    if (!callbackQuery.message) {
      this.logger.warn('Callback query missing message property', { callbackQueryId: callbackQuery.id });
      // Answer callback query even if message is missing
      try {
        await axios.post(`${this.apiUrl}/answerCallbackQuery`, {
          callback_query_id: callbackQuery.id,
          text: 'This action requires a message context.',
        });
      } catch (error) {
        this.logger.error('Failed to answer callback query', error);
      }
      return;
    }

    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    // Handle button clicks
    if (data === 'refresh_contacts') {
      // Ensure callbackQuery.from exists before creating message object
      if (!callbackQuery.from) {
        this.logger.warn('Callback query missing from property', { callbackQueryId: callbackQuery.id });
        return;
      }
      await this.handleContactsCommand({ chat: { id: chatId }, from: callbackQuery.from } as any);
    }

    // Answer callback query
    try {
      await axios.post(`${this.apiUrl}/answerCallbackQuery`, {
        callback_query_id: callbackQuery.id,
      });
    } catch (error) {
      this.logger.error('Failed to answer callback query', error);
    }
  }

  private async handleStatusCommand(message: TelegramMessage) {
    const chatId = message.chat.id;

    // Find contact
    const contact = await this.prisma.contact.findFirst({
      where: {
        telegramChatId: BigInt(chatId),
      },
      include: {
        organization: true,
        company: true,
      },
    });

    if (!contact) {
      await this.sendMessage(
        chatId.toString(),
        '⚠️ You are not linked to any contact in the CRM. Please contact your administrator.',
      );
      return;
    }

    const statusMessage =
      `✅ Connected to GetSale AI CRM\n\n` +
      `${contact.organization ? `📧 Organization: ${contact.organization.name}\n` : ''}` +
      `${contact.company ? `🏢 Company: ${contact.company.name}\n` : ''}` +
      `👤 Contact: ${contact.firstName || contact.email || 'Unknown'}\n` +
      `📅 Linked: ${new Date(contact.createdAt).toLocaleDateString()}`;

    await this.sendMessage(chatId.toString(), statusMessage);
  }

  private async handleContactsCommand(message: TelegramMessage) {
    const chatId = message.chat.id;

    // Find contact and organization
    const contact = await this.prisma.contact.findFirst({
      where: {
        telegramChatId: BigInt(chatId),
      },
    });

    if (!contact) {
      await this.sendMessage(
        chatId.toString(),
        '⚠️ You are not linked to any contact in the CRM.',
      );
      return;
    }

    // Get recent contacts from same organization
    const contacts = await this.prisma.contact.findMany({
      where: {
        organizationId: contact.organizationId,
      },
      take: 5,
      orderBy: { updatedAt: 'desc' },
      include: {
        company: true,
      },
    });

    if (contacts.length === 0) {
      await this.sendMessage(chatId.toString(), '📭 No contacts found in your organization.');
      return;
    }

    let messageText = '📇 Recent Contacts:\n\n';
    contacts.forEach((c, index) => {
      const name = c.firstName || c.lastName || c.email || 'Unnamed';
      messageText += `${index + 1}. ${name}\n`;
      if (c.company) {
        messageText += `   🏢 ${c.company.name}\n`;
      }
      if (c.email) {
        messageText += `   📧 ${c.email}\n`;
      }
      messageText += '\n';
    });

    // Add inline keyboard
    const keyboard = {
      inline_keyboard: [
        [{ text: '🔄 Refresh', callback_data: 'refresh_contacts' }],
      ],
    };

    try {
      await axios.post(`${this.apiUrl}/sendMessage`, {
        chat_id: chatId,
        text: messageText,
        reply_markup: keyboard,
      });
    } catch (error) {
      this.logger.error('Failed to send contacts', error);
    }
  }

  private async handleSettingsCommand(message: TelegramMessage) {
    const chatId = message.chat.id;

    // Find contact
    const contact = await this.prisma.contact.findFirst({
      where: {
        telegramChatId: BigInt(chatId),
      },
      include: {
        organization: true,
      },
    });

    if (!contact) {
      await this.sendMessage(
        chatId.toString(),
        '⚠️ You are not linked to any contact in the CRM.',
      );
      return;
    }

    const settingsMessage =
      '⚙️ Settings\n\n' +
      `📧 Email notifications: Enabled\n` +
      `🔔 Message alerts: Enabled\n` +
      `🌐 Language: English\n\n` +
      `To change settings, please use the web dashboard at ${this.configService.get('FRONTEND_URL') || 'https://app.getsale.ai'}`;

    await this.sendMessage(chatId.toString(), settingsMessage);
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

      // Detect campaign reply
      // Note: This should be done after message creation, but we need MessagesService
      // For now, we'll handle it via event subscription or add it to MessagesService
      
      // Publish event
      await this.eventsService.publish(EventType.MESSAGE_RECEIVED, {
        organizationId: contact.organizationId,
        entityType: 'message',
        entityId: message.id.toString(),
        data: {
          chatId: chat.id,
          contactId: contact.id,
          content: text,
        },
      });

      // Broadcast via WebSocket
      this.websocketGateway.broadcastMessage(chat.id, {
        id: message.id.toString(),
        chatId: chat.id,
        content: text,
        isIncoming: true,
        createdAt: new Date(),
      });

      // Send notification to organization members
      const members = await this.prisma.organizationMember.findMany({
        where: { organizationId: contact.organizationId },
        select: { userId: true },
      });

      for (const member of members) {
        await this.notificationsService.handleMessageReceived(
          contact.organizationId,
          member.userId,
          {
            chatId: chat.id,
            contactId: contact.id,
            contactName: contact.firstName || contact.email || 'Contact',
          },
        );
      }

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
