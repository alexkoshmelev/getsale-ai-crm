import { Controller, Get, Patch, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ChatsService } from './chats.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationId } from '../common/decorators/organization.decorator';

@ApiTags('chats')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chats')
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all chats' })
  findAll(@OrganizationId() organizationId: string) {
    return this.chatsService.findAll(organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get chat by ID' })
  findOne(@Param('id') id: string, @OrganizationId() organizationId: string) {
    return this.chatsService.findOne(id, organizationId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark chat as read' })
  markAsRead(@Param('id') id: string, @OrganizationId() organizationId: string) {
    return this.chatsService.markAsRead(id, organizationId);
  }
}

