import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreatePipelineDto } from './dto/create-pipeline.dto';
import { UpdatePipelineDto } from './dto/update-pipeline.dto';
import { CreateStageDto } from './dto/create-stage.dto';

@Injectable()
export class PipelinesService {
  constructor(private prisma: PrismaService) {}

  async create(organizationId: string, createDto: CreatePipelineDto) {
    const pipeline = await this.prisma.pipeline.create({
      data: {
        ...createDto,
        organizationId,
      },
    });

    // Create default stages if none provided
    if (createDto.createDefaultStages !== false) {
      const defaultStages = [
        { name: 'Cold', orderIndex: 0, color: '#94a3b8' },
        { name: 'Replied', orderIndex: 1, color: '#3b82f6' },
        { name: 'Qualified', orderIndex: 2, color: '#8b5cf6' },
        { name: 'Meeting', orderIndex: 3, color: '#f59e0b' },
        { name: 'Deal', orderIndex: 4, color: '#10b981' },
        { name: 'Lost', orderIndex: 5, color: '#ef4444' },
      ];

      await Promise.all(
        defaultStages.map((stage) =>
          this.prisma.pipelineStage.create({
            data: {
              ...stage,
              pipelineId: pipeline.id,
            },
          }),
        ),
      );
    }

    return this.findOne(pipeline.id, organizationId);
  }

  async findAll(organizationId: string) {
    return this.prisma.pipeline.findMany({
      where: { organizationId },
      include: {
        stages: {
          orderBy: { orderIndex: 'asc' },
        },
        _count: {
          select: {
            deals: true,
          },
        },
      },
    });
  }

  async findOne(id: string, organizationId: string) {
    const pipeline = await this.prisma.pipeline.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        stages: {
          orderBy: { orderIndex: 'asc' },
          include: {
            _count: {
              select: {
                deals: true,
              },
            },
          },
        },
      },
    });

    if (!pipeline) {
      throw new NotFoundException('Pipeline not found');
    }

    return pipeline;
  }

  async update(id: string, organizationId: string, updateDto: UpdatePipelineDto) {
    await this.findOne(id, organizationId); // Check exists

    return this.prisma.pipeline.update({
      where: { id },
      data: updateDto,
    });
  }

  async createStage(pipelineId: string, organizationId: string, createDto: CreateStageDto) {
    await this.findOne(pipelineId, organizationId); // Check pipeline exists

    return this.prisma.pipelineStage.create({
      data: {
        ...createDto,
        pipelineId,
      },
    });
  }

  async updateStage(
    stageId: string,
    organizationId: string,
    updateDto: Partial<CreateStageDto>,
  ) {
    const stage = await this.prisma.pipelineStage.findUnique({
      where: { id: stageId },
      include: { pipeline: true },
    });

    if (!stage || stage.pipeline.organizationId !== organizationId) {
      throw new NotFoundException('Stage not found');
    }

    return this.prisma.pipelineStage.update({
      where: { id: stageId },
      data: updateDto,
    });
  }
}

