import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { EventsService, EventType } from '../events/events.service';

@Injectable()
export class PoliciesService {
  private readonly logger = new Logger(PoliciesService.name);

  constructor(
    private prisma: PrismaService,
    private eventsService: EventsService,
  ) {}

  /**
   * Get company policies
   */
  async getCompanyPolicies(organizationId: string, companyId?: string) {
    const where: any = { organizationId, isActive: true };
    if (companyId) {
      where.companyId = companyId;
    }

    return this.prisma.companyPolicy.findMany({
      where,
      include: {
        company: true,
      },
    });
  }

  /**
   * Get pipeline policies
   */
  async getPipelinePolicies(organizationId: string, pipelineId?: string) {
    const where: any = { organizationId, isActive: true };
    if (pipelineId) {
      where.pipelineId = pipelineId;
    }

    return this.prisma.pipelinePolicy.findMany({
      where,
      include: {
        pipeline: true,
      },
    });
  }

  /**
   * Execute policies for an event
   */
  async executePolicies(
    organizationId: string,
    eventType: string,
    eventData: any,
  ) {
    // Get relevant company policies
    const companyPolicies = await this.prisma.companyPolicy.findMany({
      where: {
        organizationId,
        isActive: true,
        policyType: this.getPolicyTypeForEvent(eventType),
      },
      include: {
        company: true,
      },
    });

    for (const policy of companyPolicies) {
      try {
        if (this.matchPolicyConditions(policy.rules as any, eventData)) {
          await this.executePolicyActions(policy, eventData, organizationId);
        }
      } catch (error) {
        this.logger.error(`Failed to execute policy: ${policy.id}`, error);
      }
    }

    // Get relevant pipeline policies
    const pipelinePolicies = await this.prisma.pipelinePolicy.findMany({
      where: {
        organizationId,
        isActive: true,
        triggerEvent: eventType,
      },
    });

    for (const policy of pipelinePolicies) {
      try {
        if (this.matchPolicyConditions(policy.conditions as any, eventData)) {
          await this.executePolicyActions(policy, eventData, organizationId);
        }
      } catch (error) {
        this.logger.error(`Failed to execute pipeline policy: ${policy.id}`, error);
      }
    }
  }

  /**
   * Create company policy
   */
  async createCompanyPolicy(organizationId: string, policyData: any) {
    return this.prisma.companyPolicy.create({
      data: {
        ...policyData,
        organizationId,
      },
    });
  }

  /**
   * Create pipeline policy
   */
  async createPipelinePolicy(organizationId: string, policyData: any) {
    return this.prisma.pipelinePolicy.create({
      data: {
        ...policyData,
        organizationId,
      },
    });
  }

  private getPolicyTypeForEvent(eventType: string): string {
    const mapping: Record<string, string> = {
      'message.received': 'action_on_reply',
      'campaign.reply': 'action_on_reply',
      'deal.stage.changed': 'sla',
    };
    return mapping[eventType] || 'sla';
  }

  private matchPolicyConditions(conditions: any, eventData: any): boolean {
    if (!conditions || Object.keys(conditions).length === 0) {
      return true;
    }

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

  private async executePolicyActions(policy: any, eventData: any, organizationId: string) {
    const actions = policy.actions || [];

    for (const action of actions) {
      switch (action.type) {
        case 'assign_bidi':
          // Assign to BiDi based on policy
          // This would integrate with BidiService
          this.logger.log(`Policy action: assign_bidi`, { policyId: policy.id });
          break;

        case 'escalate':
          // Escalate to supervisor
          await this.eventsService.publish(EventType.DEAL_STAGE_CHANGED, {
            organizationId,
            entityType: 'escalation',
            data: { policyId: policy.id, eventData },
          });
          break;

        case 'notify':
          // Send notification
          this.logger.log(`Policy action: notify`, { policyId: policy.id });
          break;

        case 'move_deal':
          // Move deal to stage
          if (eventData.dealId && action.params?.stageId) {
            // This would integrate with DealsService
            this.logger.log(`Policy action: move_deal`, { policyId: policy.id });
          }
          break;
      }
    }
  }
}

