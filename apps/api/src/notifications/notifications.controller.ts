import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationId } from '../common/decorators/organization.decorator';
import { CurrentUser } from '../common/decorators/user.decorator';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all notifications' })
  findAll(
    @CurrentUser() user: any,
    @OrganizationId() organizationId: string,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.notificationsService.findAll(
      user.id,
      organizationId,
      unreadOnly === 'true',
    );
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  markAsRead(@Param('id') id: string, @CurrentUser() user: any) {
    return this.notificationsService.markAsRead(id, user.id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllAsRead(
    @CurrentUser() user: any,
    @OrganizationId() organizationId: string,
  ) {
    return this.notificationsService.markAllAsRead(user.id, organizationId);
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Get notification preferences' })
  getPreferences(
    @CurrentUser() user: any,
    @OrganizationId() organizationId: string,
  ) {
    return this.notificationsService.getPreferences(user.id, organizationId);
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Update notification preferences' })
  updatePreferences(
    @CurrentUser() user: any,
    @OrganizationId() organizationId: string,
    @Body() preferences: any,
  ) {
    return this.notificationsService.updatePreferences(
      user.id,
      organizationId,
      preferences,
    );
  }
}

