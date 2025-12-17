import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { EventsService, EventType } from '../events/events.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';

@Injectable()
export class DealsService {
  constructor(
    private prisma: PrismaService,
    private eventsService: EventsService,
    private notificationsService: NotificationsService,
  ) {}

  async create(organizationId: string, createDto: CreateDealDto) {
    // Verify pipeline belongs to organization
    const pipeline = await this.prisma.pipeline.findFirst({
      where: {
        id: createDto.pipelineId,
        organizationId,
      },
    });

    if (!pipeline) {
      throw new NotFoundException('Pipeline not found');
    }

    // Get first stage if not provided
    let stageId = createDto.stageId;
    if (!stageId) {
      const firstStage = await this.prisma.pipelineStage.findFirst({
        where: { pipelineId: pipeline.id },
        orderBy: { orderIndex: 'asc' },
      });
      stageId = firstStage?.id;
    }

    return this.prisma.deal.create({
      data: {
        ...createDto,
        organizationId,
        stageId,
      },
      include: {
        contact: true,
        company: true,
        stage: true,
        pipeline: true,
      },
    });
  }

  async findAll(organizationId: string, pipelineId?: string, stageId?: string) {
    return this.prisma.deal.findMany({
      where: {
        organizationId,
        ...(pipelineId && { pipelineId }),
        ...(stageId && { stageId }),
      },
      include: {
        contact: true,
        company: true,
        stage: true,
        pipeline: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string, organizationId: string) {
    const deal = await this.prisma.deal.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        contact: true,
        company: true,
        stage: true,
        pipeline: true,
      },
    });

    if (!deal) {
      throw new NotFoundException('Deal not found');
    }

    return deal;
  }

  async update(id: string, organizationId: string, updateDto: UpdateDealDto) {
    await this.findOne(id, organizationId); // Check exists

    return this.prisma.deal.update({
      where: { id },
      data: updateDto,
      include: {
        contact: true,
        company: true,
        stage: true,
        pipeline: true,
      },
    });
  }

  async updateStage(id: string, organizationId: string, stageId: string) {
    await this.findOne(id, organizationId); // Check deal exists

    // Verify stage belongs to same pipeline
    const deal = await this.prisma.deal.findUnique({
      where: { id },
      include: { pipeline: true, stage: true },
    });

    const stage = await this.prisma.pipelineStage.findFirst({
      where: {
        id: stageId,
        pipelineId: deal.pipelineId,
      },
    });

    if (!stage) {
      throw new NotFoundException('Stage not found in this pipeline');
    }

    const oldStage = deal.stage;
    const updatedDeal = await this.prisma.deal.update({
      where: { id },
      data: { stageId },
      include: {
        contact: true,
        company: true,
        stage: true,
        pipeline: true,
      },
    });

    // Publish event
    await this.eventsService.publish(EventType.DEAL_STAGE_CHANGED, {
      organizationId,
      entityType: 'deal',
      entityId: updatedDeal.id,
      data: {
        dealId: updatedDeal.id,
        dealName: updatedDeal.name,
        oldStage: oldStage?.name,
        newStage: updatedDeal.stage?.name,
      },
    });

    // Send notifications to organization members
    const members = await this.prisma.organizationMember.findMany({
      where: { organizationId },
      select: { userId: true },
    });

    for (const member of members) {
      await this.notificationsService.handleDealStageChanged(organizationId, member.userId, {
        dealId: updatedDeal.id,
        dealName: updatedDeal.name,
        newStage: updatedDeal.stage?.name || 'Unknown',
      });
    }

    return updatedDeal;
  }

  async remove(id: string, organizationId: string) {
    await this.findOne(id, organizationId); // Check exists

    return this.prisma.deal.delete({
      where: { id },
    });
  }
}

