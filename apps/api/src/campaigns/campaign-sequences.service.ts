import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { Queue } from 'bullmq';
import { RedisService } from '../common/redis/redis.service';
import { EventsService, EventType } from '../events/events.service';

@Injectable()
export class CampaignSequencesService {
  private readonly logger = new Logger(CampaignSequencesService.name);
  private campaignQueue: Queue;

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private eventsService: EventsService,
  ) {
    this.campaignQueue = new Queue('campaigns', {
      connection: this.redis.getClient() as any,
    });
  }

  /**
   * Schedule next sequence step for a contact
   */
  async scheduleNextStep(
    campaignId: string,
    contactId: string,
    organizationId: string,
    currentStep: number,
  ) {
    const sequences = await this.prisma.campaignSequence.findMany({
      where: {
        campaignId,
        stepNumber: { gt: currentStep },
        isActive: true,
      },
      orderBy: { stepNumber: 'asc' },
    });

    if (sequences.length === 0) {
      return null;
    }

    const nextSequence = sequences[0];

    // Check conditions
    if (!(await this.checkSequenceConditions(nextSequence, contactId, organizationId))) {
      this.logger.log(`Sequence step ${nextSequence.stepNumber} conditions not met for contact ${contactId}`);
      return null;
    }

    // Calculate delay
    const delayMs = (nextSequence.delayDays * 24 * 60 * 60 * 1000) + (nextSequence.delayHours * 60 * 60 * 1000);

    // Schedule job
    const jobId = `campaign-${campaignId}-contact-${contactId}-step-${nextSequence.stepNumber}`;
    await this.campaignQueue.add(
      'send-campaign-sequence',
      {
        campaignId,
        contactId,
        organizationId,
        sequenceId: nextSequence.id,
        messageTemplate: nextSequence.template,
        stepNumber: nextSequence.stepNumber,
      },
      {
        jobId,
        delay: delayMs,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    );

    this.logger.log(`Scheduled sequence step ${nextSequence.stepNumber} for contact ${contactId} with delay ${delayMs}ms`);

    return nextSequence;
  }

  /**
   * Check if sequence conditions are met
   */
  private async checkSequenceConditions(sequence: any, contactId: string, organizationId: string): Promise<boolean> {
    if (!sequence.conditions || Object.keys(sequence.conditions).length === 0) {
      return true; // No conditions, always send
    }

    const conditions = sequence.conditions as any;

    // Check if contact replied (common condition)
    if (conditions.requireReply === true) {
      const hasReplied = await this.prisma.campaignMessage.findFirst({
        where: {
          contactId,
          campaignId: sequence.campaignId,
          status: 'replied',
        },
      });

      if (!hasReplied) {
        return false;
      }
    }

    // Check if contact opened (for email campaigns)
    if (conditions.requireOpen === true) {
      // TODO: implement email open tracking
      return false;
    }

    // Check custom conditions
    if (conditions.tags) {
      const contact = await this.prisma.contact.findUnique({
        where: { id: contactId },
        select: { tags: true },
      });

      if (!contact || !conditions.tags.some((tag: string) => contact.tags.includes(tag))) {
        return false;
      }
    }

    return true;
  }

  /**
   * Process sequence step (called by processor)
   */
  async processSequenceStep(
    campaignId: string,
    contactId: string,
    organizationId: string,
    sequenceId: string,
    stepNumber: number,
    template: string,
  ) {
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
      return null;
    }

    // Get contact
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, organizationId },
      include: { company: true },
    });

    if (!contact) {
      throw new Error(`Contact ${contactId} not found`);
    }

    // Process template with conditionals
    const message = this.processTemplate(template, contact);

    // Create campaign message
    const campaignMessage = await this.prisma.campaignMessage.create({
      data: {
        campaignId,
        contactId,
        status: 'pending',
        sequenceStep: stepNumber,
      },
    });

    // Send message (this would be handled by CampaignsProcessor)
    await this.eventsService.publish(EventType.MESSAGE_SENT, {
      organizationId,
      entityType: 'campaign_sequence',
      entityId: campaignMessage.id,
      data: {
        campaignId,
        contactId,
        sequenceId,
        stepNumber,
        message,
      },
    });

    return campaignMessage;
  }

  private processTemplate(template: string, contact: any): string {
    let message = template;

    // Replace variables
    message = message.replace(/\{\{firstName\}\}/g, contact.firstName || '');
    message = message.replace(/\{\{lastName\}\}/g, contact.lastName || '');
    message = message.replace(/\{\{email\}\}/g, contact.email || '');
    message = message.replace(/\{\{phone\}\}/g, contact.phone || '');
    message = message.replace(/\{\{role\}\}/g, contact.role || '');

    if (contact.company) {
      message = message.replace(/\{\{companyName\}\}/g, contact.company.name || '');
      message = message.replace(/\{\{companyIndustry\}\}/g, contact.company.industry || '');
    }

    // Process conditionals
    message = this.processConditionalBlocks(message, contact);

    return message;
  }

  private processConditionalBlocks(template: string, contact: any): string {
    let result = template;
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
}

