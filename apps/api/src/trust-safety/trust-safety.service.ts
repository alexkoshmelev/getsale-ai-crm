import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class TrustSafetyService {
  private readonly logger = new Logger(TrustSafetyService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Check if contact is opted out
   */
  async isOptedOut(organizationId: string, contactId?: string, email?: string, phone?: string): Promise<boolean> {
    const where: any = { organizationId };

    if (contactId) {
      where.contactId = contactId;
    } else if (email) {
      where.email = email;
    } else if (phone) {
      where.phone = phone;
    } else {
      return false;
    }

    const optOut = await this.prisma.contactOptOut.findFirst({ where });
    return !!optOut;
  }

  /**
   * Check if contact is blacklisted
   */
  async isBlacklisted(organizationId: string, email?: string, phone?: string, domain?: string): Promise<boolean> {
    const where: any = {
      organizationId,
      isActive: true,
    };

    if (email) {
      where.email = email;
      const domainFromEmail = email.split('@')[1];
      if (domainFromEmail) {
        where.domain = domainFromEmail;
      }
    }

    if (phone) {
      where.phone = phone;
    }

    if (domain) {
      where.domain = domain;
    }

    const blacklist = await this.prisma.contactBlacklist.findFirst({ where });
    return !!blacklist;
  }

  /**
   * Check message throttling
   */
  async canSendMessage(
    organizationId: string,
    contactId: string,
    channel: string,
    maxPerHour: number = 5,
  ): Promise<boolean> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Get or create throttle record
    let throttle = await this.prisma.messageThrottle.findUnique({
      where: {
        organizationId_contactId_channel: {
          organizationId,
          contactId,
          channel,
        },
      },
    });

    if (!throttle) {
      throttle = await this.prisma.messageThrottle.create({
        data: {
          organizationId,
          contactId,
          channel,
          lastSentAt: new Date(),
          messageCount: 1,
          windowStart: new Date(),
        },
      });
      return true;
    }

    // Reset if window expired
    if (throttle.windowStart < oneHourAgo) {
      await this.prisma.messageThrottle.update({
        where: { id: throttle.id },
        data: {
          messageCount: 1,
          windowStart: new Date(),
          lastSentAt: new Date(),
        },
      });
      return true;
    }

    // Check limit
    if (throttle.messageCount >= maxPerHour) {
      return false;
    }

    // Increment count
    await this.prisma.messageThrottle.update({
      where: { id: throttle.id },
      data: {
        messageCount: throttle.messageCount + 1,
        lastSentAt: new Date(),
      },
    });

    return true;
  }

  /**
   * Add contact to opt-out list
   */
  async optOut(
    organizationId: string,
    contactId?: string,
    email?: string,
    phone?: string,
    reason?: string,
  ) {
    return this.prisma.contactOptOut.create({
      data: {
        organizationId,
        contactId,
        email,
        phone,
        reason,
        source: 'manual',
      },
    });
  }

  /**
   * Add to blacklist
   */
  async addToBlacklist(
    organizationId: string,
    email?: string,
    phone?: string,
    domain?: string,
    reason?: string,
  ) {
    return this.prisma.contactBlacklist.create({
      data: {
        organizationId,
        email,
        phone,
        domain,
        reason,
      },
    });
  }

  /**
   * Validate before sending message
   */
  async validateMessageSend(
    organizationId: string,
    contactId: string,
    channel: string,
    email?: string,
    phone?: string,
  ) {
    // Check opt-out
    if (await this.isOptedOut(organizationId, contactId, email, phone)) {
      throw new BadRequestException('Contact has opted out');
    }

    // Check blacklist
    if (await this.isBlacklisted(organizationId, email, phone)) {
      throw new BadRequestException('Contact is blacklisted');
    }

    // Check throttling
    if (!(await this.canSendMessage(organizationId, contactId, channel))) {
      throw new BadRequestException('Message rate limit exceeded');
    }

    return true;
  }
}

