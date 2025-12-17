import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { EventsService, EventType } from '../events/events.service';

@Injectable()
export class ContactsService {
  constructor(
    private prisma: PrismaService,
    private eventsService: EventsService,
  ) {}

  async create(organizationId: string, createDto: CreateContactDto) {
    const contact = await this.prisma.contact.create({
      data: {
        ...createDto,
        organizationId,
      },
      include: {
        company: true,
      },
    });

    await this.eventsService.publish(EventType.CONTACT_CREATED, {
      organizationId,
      entityType: 'contact',
      entityId: contact.id,
      data: { contact },
    });

    return contact;
  }

  async findAll(organizationId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.contact.findMany({
        where: { organizationId },
        skip,
        take: limit,
        include: {
          company: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.contact.count({
        where: { organizationId },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, organizationId: string) {
    const contact = await this.prisma.contact.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        company: true,
        chats: {
          take: 5,
          orderBy: { lastMessageAt: 'desc' },
        },
      },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    return contact;
  }

  async update(id: string, organizationId: string, updateDto: UpdateContactDto) {
    await this.findOne(id, organizationId); // Check exists

    const contact = await this.prisma.contact.update({
      where: { id },
      data: updateDto,
      include: {
        company: true,
      },
    });

    await this.eventsService.publish(EventType.CONTACT_UPDATED, {
      organizationId,
      entityType: 'contact',
      entityId: contact.id,
      data: { contact },
    });

    return contact;
  }

  async remove(id: string, organizationId: string) {
    const contact = await this.findOne(id, organizationId); // Check exists

    await this.prisma.contact.delete({
      where: { id },
    });

    await this.eventsService.publish(EventType.CONTACT_DELETED, {
      organizationId,
      entityType: 'contact',
      entityId: id,
      data: { contact },
    });

    return contact;
  }

  async search(organizationId: string, query: string) {
    return this.prisma.contact.findMany({
      where: {
        organizationId,
        OR: [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: {
        company: true,
      },
      take: 20,
    });
  }
}

