import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { AddMemberDto } from './dto/add-member.dto';

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createDto: CreateOrganizationDto) {
    return this.prisma.organization.create({
      data: {
        ...createDto,
        members: {
          create: {
            userId,
            role: 'owner',
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.organization.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });
  }

  async findOne(id: string, userId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Check if user is member
    const isMember = organization.members.some((m) => m.userId === userId);
    if (!isMember) {
      throw new ForbiddenException('Access denied to this organization');
    }

    return organization;
  }

  async update(id: string, userId: string, updateDto: UpdateOrganizationDto) {
    // Check permissions
    await this.checkPermission(id, userId, ['owner', 'admin']);

    return this.prisma.organization.update({
      where: { id },
      data: updateDto,
    });
  }

  async addMember(id: string, userId: string, addMemberDto: AddMemberDto) {
    // Check permissions
    await this.checkPermission(id, userId, ['owner', 'admin']);

    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { email: addMemberDto.email },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if already member
    const existingMember = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: id,
          userId: user.id,
        },
      },
    });

    if (existingMember) {
      throw new ForbiddenException('User is already a member');
    }

    return this.prisma.organizationMember.create({
      data: {
        organizationId: id,
        userId: user.id,
        role: addMemberDto.role,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async removeMember(id: string, memberId: string, userId: string) {
    // Check permissions
    await this.checkPermission(id, userId, ['owner', 'admin']);

    const member = await this.prisma.organizationMember.findUnique({
      where: { id: memberId },
    });

    if (!member || member.organizationId !== id) {
      throw new NotFoundException('Member not found');
    }

    // Prevent removing owner
    if (member.role === 'owner') {
      throw new ForbiddenException('Cannot remove organization owner');
    }

    return this.prisma.organizationMember.delete({
      where: { id: memberId },
    });
  }

  private async checkPermission(
    organizationId: string,
    userId: string,
    allowedRoles: string[],
  ) {
    const member = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
    });

    if (!member || !allowedRoles.includes(member.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }
  }
}

