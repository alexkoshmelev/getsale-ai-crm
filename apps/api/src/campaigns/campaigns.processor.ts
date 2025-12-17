import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { EmailService } from '../email/email.service';
import { EventsService, EventType } from '../events/events.service';

interface CampaignJobData {
  campaignId: string;
  contactId: string;
  organizationId: string;
  messageTemplate: string;
}

@Processor('campaigns')
export class CampaignsProcessor extends WorkerHost {
  private readonly logger = new Logger(CampaignsProcessor.name);

  constructor(
    private prisma: PrismaService,
    private telegramService: TelegramService,
    private emailService: EmailService,
    private eventsService: EventsService,
  ) {
    super();
  }

  async process(job: Job<CampaignJobData>) {
    const { campaignId, contactId, organizationId, messageTemplate } = job.data;

    try {
      const contact = await this.prisma.contact.findFirst({
        where: {
          id: contactId,
          organizationId,
        },
      });

      if (!contact) {
        throw new Error(`Contact ${contactId} not found`);
      }

      // Replace template variables
      const message = this.replaceTemplateVariables(messageTemplate, contact);

      // Determine channel and send
      let channel = 'telegram';
      if (contact.email && !contact.telegramChatId) {
        channel = 'email';
      }

      // Create campaign message record
      const campaignMessage = await this.prisma.campaignMessage.create({
        data: {
          campaignId,
          contactId,
          status: 'pending',
        },
      });

      try {
        if (channel === 'telegram' && contact.telegramChatId) {
          await this.telegramService.sendMessageToContact(
            contactId,
            organizationId,
            message,
          );
        } else if (channel === 'email' && contact.email) {
          await this.emailService.sendEmailToContact(
            contactId,
            organizationId,
            `Campaign: ${message.substring(0, 50)}...`,
            message,
          );
        } else {
          throw new Error('No valid channel for contact');
        }

        // Update status
        await this.prisma.campaignMessage.update({
          where: { id: campaignMessage.id },
          data: {
            status: 'sent',
            sentAt: new Date(),
          },
        });

        await this.eventsService.publish(EventType.MESSAGE_SENT, {
          organizationId,
          entityType: 'campaign_message',
          entityId: campaignMessage.id,
          data: { campaignId, contactId, channel },
        });

        this.logger.log(`Campaign message sent: ${campaignMessage.id}`);
      } catch (error: any) {
        await this.prisma.campaignMessage.update({
          where: { id: campaignMessage.id },
          data: {
            status: 'failed',
            errorMessage: error.message,
          },
        });
        throw error;
      }
    } catch (error: any) {
      this.logger.error(`Failed to process campaign job: ${job.id}`, error);
      throw error;
    }
  }

  private replaceTemplateVariables(template: string, contact: any): string {
    let message = template;

    // Replace contact variables
    message = message.replace(/\{\{firstName\}\}/g, contact.firstName || '');
    message = message.replace(/\{\{lastName\}\}/g, contact.lastName || '');
    message = message.replace(/\{\{email\}\}/g, contact.email || '');
    message = message.replace(/\{\{role\}\}/g, contact.role || '');

    // Replace company variables
    if (contact.company) {
      message = message.replace(/\{\{companyName\}\}/g, contact.company.name || '');
      message = message.replace(/\{\{companyIndustry\}\}/g, contact.company.industry || '');
    }

    return message;
  }
}

