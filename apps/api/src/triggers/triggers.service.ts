import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { EventsService, EventType } from '../events/events.service';
import { CreateTriggerDto } from './dto/create-trigger.dto';
import { UpdateTriggerDto } from './dto/update-trigger.dto';
import { DealsService } from '../deals/deals.service';
import { MessagesService } from '../messages/messages.service';

@Injectable()
export class TriggersService {
  private readonly logger = new Logger(TriggersService.name);

  constructor(
    private prisma: PrismaService,
    private eventsService: EventsService,
    private dealsService: DealsService,
    private messagesService: MessagesService,
  ) {
    // Subscribe to events for trigger execution
    this.setupEventSubscriptions();
  }

  private async setupEventSubscriptions() {
    // This will be called for each organization when they connect
    // For now, we'll handle triggers on-demand when events are published
  }

  async create(organizationId: string, createDto: CreateTriggerDto) {
    return this.prisma.trigger.create({
      data: {
        ...createDto,
        organizationId,
        isActive: createDto.isActive ?? true,
        priority: createDto.priority ?? 0,
      },
    });
  }

  async findAll(organizationId: string) {
    return this.prisma.trigger.findMany({
      where: { organizationId },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(id: string, organizationId: string) {
    const trigger = await this.prisma.trigger.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!trigger) {
      throw new NotFoundException('Trigger not found');
    }

    return trigger;
  }

  async update(id: string, organizationId: string, updateDto: UpdateTriggerDto) {
    await this.findOne(id, organizationId); // Check exists

    return this.prisma.trigger.update({
      where: { id },
      data: updateDto,
    });
  }

  async remove(id: string, organizationId: string) {
    await this.findOne(id, organizationId); // Check exists

    return this.prisma.trigger.delete({
      where: { id },
    });
  }

  /**
   * Execute triggers for a given event
   * Called by event handlers when events are published
   */
  async executeTriggersForEvent(
    organizationId: string,
    eventType: string,
    eventData: any,
  ) {
    const triggers = await this.prisma.trigger.findMany({
      where: {
        organizationId,
        eventType,
        isActive: true,
      },
      orderBy: { priority: 'desc' },
    });

    for (const trigger of triggers) {
      try {
        // Check conditions
        if (!this.matchConditions(trigger.conditions as any, eventData)) {
          continue;
        }

        const startTime = Date.now();

        // Execute actions
        for (const action of trigger.actions as any[]) {
          await this.executeAction(action, eventData, organizationId);
        }

        const executionTimeMs = Date.now() - startTime;

        // Log execution
        await this.prisma.triggerExecution.create({
          data: {
            triggerId: trigger.id,
            organizationId,
            eventType,
            eventId: eventData.entityId,
            status: 'success',
            executionTimeMs,
          },
        });

        this.logger.log(`Trigger executed: ${trigger.name}`, { triggerId: trigger.id, eventType });
      } catch (error: any) {
        this.logger.error(`Trigger execution failed: ${trigger.name}`, error);

        // Log failed execution
        await this.prisma.triggerExecution.create({
          data: {
            triggerId: trigger.id,
            organizationId,
            eventType,
            eventId: eventData.entityId,
            status: 'error',
            errorMessage: error.message,
          },
        });
      }
    }
  }

  private matchConditions(conditions: any, eventData: any): boolean {
    if (!conditions || Object.keys(conditions).length === 0) {
      return true; // No conditions = match all
    }

    // Simple condition matching
    // Can be extended for complex logic
    for (const [key, value] of Object.entries(conditions)) {
      const eventValue = this.getNestedValue(eventData, key);
      if (eventValue !== value) {
        return false;
      }
    }

    return true;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, prop) => current?.[prop], obj);
  }

  private async executeAction(action: any, eventData: any, organizationId: string) {
    switch (action.type) {
      case 'move_deal':
        if (eventData.dealId && action.params?.stageId) {
          await this.dealsService.updateStage(
            eventData.dealId,
            organizationId,
            action.params.stageId,
          );
        }
        break;

      case 'create_deal':
        // Create deal from contact
        if (eventData.contactId && action.params) {
          await this.dealsService.create(organizationId, {
            contactId: eventData.contactId,
            ...action.params,
          });
        }
        break;

      case 'send_message':
        // Send automated message
        if (eventData.chatId && action.params?.content) {
          // This would need to be implemented in MessagesService
          this.logger.warn('Send message action not fully implemented');
        }
        break;

      case 'update_contact':
        // Update contact fields
        if (eventData.contactId && action.params) {
          // Would need ContactsService
          this.logger.warn('Update contact action not fully implemented');
        }
        break;

      case 'publish_event':
        // Chain events
        if (action.params?.eventType) {
          await this.eventsService.publish(action.params.eventType as EventType, {
            organizationId,
            entityType: action.params.entityType,
            entityId: eventData.entityId,
            data: action.params.data || eventData,
          });
        }
        break;

      default:
        this.logger.warn(`Unknown action type: ${action.type}`);
    }
  }

  async getExecutions(triggerId: string, organizationId: string, limit = 50) {
    await this.findOne(triggerId, organizationId); // Check trigger exists

    return this.prisma.triggerExecution.findMany({
      where: {
        triggerId,
        organizationId,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}

