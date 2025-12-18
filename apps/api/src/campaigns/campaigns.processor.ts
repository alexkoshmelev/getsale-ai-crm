import { Processor, WorkerHost, Process } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { PrismaService } from '../common/prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { EmailService } from '../email/email.service';
import { EventsService, EventType } from '../events/events.service';
import { CampaignSequencesService } from './campaign-sequences.service';

interface CampaignJobData {
  campaignId: string;
  contactId: string;
  organizationId: string;
  messageTemplate: string;
  sequenceId?: string;
  stepNumber?: number;
}

@Processor('campaigns')
export class CampaignsProcessor extends WorkerHost {
  private readonly logger = new Logger(CampaignsProcessor.name);

  constructor(
    private prisma: PrismaService,
    private telegramService: TelegramService,
    private emailService: EmailService,
    private eventsService: EventsService,
    private moduleRef: ModuleRef,
    private sequencesService: CampaignSequencesService,
  ) {
    super();
  }

  @Process('send-campaign-message')
  async processCampaignMessage(job: Job<CampaignJobData>) {
    const { campaignId, contactId, organizationId, messageTemplate } = job.data;

    try {
      const contact = await this.prisma.contact.findFirst({
        where: {
          id: contactId,
          organizationId,
        },
        include: {
          company: true,
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
    message = message.replace(/\{\{phone\}\}/g, contact.phone || '');
    message = message.replace(/\{\{role\}\}/g, contact.role || '');

    // Replace company variables
    if (contact.company) {
      message = message.replace(/\{\{companyName\}\}/g, contact.company.name || '');
      message = message.replace(/\{\{companyIndustry\}\}/g, contact.company.industry || '');
    }

    // Process conditional blocks: {{#if condition}}...{{/if}}
    message = this.processConditionalBlocks(message, contact);

    return message;
  }

  /**
   * Process conditional blocks in template
   * Syntax: {{#if variable}}content{{/if}} or {{#if variable}}content{{else}}alternative{{/if}}
   */
  private processConditionalBlocks(template: string, contact: any): string {
    let result = template;

    // Match {{#if variable}}...{{/if}} or {{#if variable}}...{{else}}...{{/if}}
    const conditionalRegex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/if\}\}/g;

    result = result.replace(conditionalRegex, (match, variable, ifContent, elseContent) => {
      const value = this.getVariableValue(variable, contact);
      const hasValue = value !== null && value !== undefined && value !== '';

      if (hasValue) {
        return ifContent;
      } else {
        return elseContent || '';
      }
    });

    return result;
  }

  private getVariableValue(variable: string, contact: any): any {
    const variableMap: Record<string, any> = {
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      phone: contact.phone,
      role: contact.role,
      companyName: contact.company?.name,
      companyIndustry: contact.company?.industry,
      hasCompany: !!contact.company,
      hasEmail: !!contact.email,
      hasPhone: !!contact.phone,
    };

    return variableMap[variable];
  }

  @Process('send-campaign-sequence')
  async processCampaignSequence(job: Job<CampaignJobData>) {
    const { campaignId, contactId, organizationId, messageTemplate, sequenceId, stepNumber } = job.data;

    if (!sequenceId || stepNumber === undefined) {
      throw new Error('Sequence ID and step number are required for sequence jobs');
    }

    try {
      const contact = await this.prisma.contact.findFirst({
        where: {
          id: contactId,
          organizationId,
        },
        include: {
          company: true,
        },
      });

      if (!contact) {
        throw new Error(`Contact ${contactId} not found`);
      }

      // Check if contact already replied (stop sequence)
      const hasReplied = await this.prisma.campaignMessage.findFirst({
        where: {
          contactId,
          campaignId,
          status: 'replied',
        },
      });

      if (hasReplied) {
        this.logger.log(`Contact ${contactId} already replied, skipping sequence step ${stepNumber}`);
        return;
      }

      // Process template with conditionals
      const message = this.replaceTemplateVariables(messageTemplate, contact);

      // Create campaign message record
      const campaignMessage = await this.prisma.campaignMessage.create({
        data: {
          campaignId,
          contactId,
          status: 'pending',
          sequenceStep: stepNumber,
        },
      });

      // Determine channel and send
      let channel = 'telegram';
      if (contact.email && !contact.telegramChatId) {
        channel = 'email';
      }

      try {
        if (channel === 'telegram' && contact.telegramChatId) {
          await this.telegramService.sendMessageToContact(contactId, organizationId, message);
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
          entityType: 'campaign_sequence',
          entityId: campaignMessage.id,
          data: {
            campaignId,
            contactId,
            sequenceId,
            stepNumber,
            channel,
          },
        });

        this.logger.log(`Campaign sequence step ${stepNumber} sent: ${campaignMessage.id}`);

        // Schedule next sequence step
        await this.sequencesService.scheduleNextStep(campaignId, contactId, organizationId, stepNumber);
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
      this.logger.error(`Failed to process campaign sequence job: ${job.id}`, error);
      throw error;
    }
  }
}

