import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpPort = this.configService.get<number>('SMTP_PORT');
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS');

    if (smtpHost && smtpUser && smtpPass) {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort || 587,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
      this.logger.log('Email transporter initialized');
    } else {
      this.logger.warn('SMTP not configured, email sending disabled');
    }
  }

  async sendEmail(
    to: string,
    subject: string,
    text: string,
    html?: string,
    organizationId?: string,
  ) {
    if (!this.transporter) {
      throw new Error('Email service not configured');
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.configService.get<string>('SMTP_USER'),
        to,
        subject,
        text,
        html: html || text,
      });

      // Log email sent
      if (organizationId) {
        await this.prisma.usageLog.create({
          data: {
            organizationId,
            metricType: 'emails_sent',
            quantity: 1,
            metadata: { messageId: info.messageId, to },
          },
        });
      }

      this.logger.log(`Email sent: ${info.messageId}`);
      return info;
    } catch (error) {
      this.logger.error('Failed to send email', error);
      throw error;
    }
  }

  async sendEmailToContact(
    contactId: string,
    organizationId: string,
    subject: string,
    text: string,
    html?: string,
  ) {
    const contact = await this.prisma.contact.findFirst({
      where: {
        id: contactId,
        organizationId,
      },
    });

    if (!contact || !contact.email) {
      throw new Error('Contact not found or no email address');
    }

    // Send email
    await this.sendEmail(contact.email, subject, text, html, organizationId);

    // Find or create chat
    let chat = await this.prisma.chat.findFirst({
      where: {
        organizationId,
        contactId: contact.id,
        channel: 'email',
        channelThreadId: contact.email,
      },
    });

    if (!chat) {
      chat = await this.prisma.chat.create({
        data: {
          organizationId,
          contactId: contact.id,
          channel: 'email',
          channelThreadId: contact.email,
          title: `Email: ${contact.email}`,
        },
      });
    }

    // Save message
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

  async handleIncomingEmail(
    from: string,
    to: string,
    subject: string,
    text: string,
    html?: string,
  ) {
    // Find contact by email
    const contact = await this.prisma.contact.findFirst({
      where: {
        email: from,
      },
      include: {
        organization: true,
      },
    });

    if (!contact) {
      this.logger.warn(`Contact not found for email: ${from}`);
      return;
    }

    // Find or create chat
    let chat = await this.prisma.chat.findFirst({
      where: {
        organizationId: contact.organizationId,
        contactId: contact.id,
        channel: 'email',
        channelThreadId: from,
      },
    });

    if (!chat) {
      chat = await this.prisma.chat.create({
        data: {
          organizationId: contact.organizationId,
          contactId: contact.id,
          channel: 'email',
          channelThreadId: from,
          title: `Email: ${from}`,
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

    // Update chat
    await this.prisma.chat.update({
      where: { id: chat.id },
      data: {
        lastMessageAt: new Date(),
        isUnread: true,
      },
    });
  }
}

