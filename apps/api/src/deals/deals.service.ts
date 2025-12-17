import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';

@Injectable()
export class DealsService {
  constructor(private prisma: PrismaService) {}

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
      include: { pipeline: true },
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

    return this.prisma.deal.update({
      where: { id },
      data: { stageId },
      include: {
        contact: true,
        company: true,
        stage: true,
        pipeline: true,
      },
    });
  }

  async remove(id: string, organizationId: string) {
    await this.findOne(id, organizationId); // Check exists

    return this.prisma.deal.delete({
      where: { id },
    });
  }
}

