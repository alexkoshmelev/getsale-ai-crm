import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';

@Injectable()
export class AgentsService {
  constructor(private prisma: PrismaService) {}

  async create(organizationId: string, createDto: CreateAgentDto) {
    return this.prisma.aiAgent.create({
      data: {
        ...createDto,
        organizationId,
      },
    });
  }

  async findAll(organizationId: string) {
    return this.prisma.aiAgent.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, organizationId: string) {
    const agent = await this.prisma.aiAgent.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        _count: {
          select: {
            executions: true,
            memories: true,
          },
        },
      },
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    return agent;
  }

  async update(id: string, organizationId: string, updateDto: UpdateAgentDto) {
    await this.findOne(id, organizationId); // Check exists

    return this.prisma.aiAgent.update({
      where: { id },
      data: updateDto,
    });
  }

  async remove(id: string, organizationId: string) {
    await this.findOne(id, organizationId); // Check exists

    return this.prisma.aiAgent.delete({
      where: { id },
    });
  }

  async getExecutions(agentId: string, organizationId: string, limit = 20) {
    await this.findOne(agentId, organizationId); // Check exists

    return this.prisma.agentExecution.findMany({
      where: { agentId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}

