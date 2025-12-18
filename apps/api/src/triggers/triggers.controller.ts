import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TriggersService } from './triggers.service';
import { CreateTriggerDto } from './dto/create-trigger.dto';
import { UpdateTriggerDto } from './dto/update-trigger.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationId } from '../common/decorators/organization.decorator';

@ApiTags('triggers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('triggers')
export class TriggersController {
  constructor(private readonly triggersService: TriggersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new trigger' })
  create(@OrganizationId() organizationId: string, @Body() createDto: CreateTriggerDto) {
    return this.triggersService.create(organizationId, createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all triggers' })
  findAll(@OrganizationId() organizationId: string) {
    return this.triggersService.findAll(organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get trigger by ID' })
  findOne(@Param('id') id: string, @OrganizationId() organizationId: string) {
    return this.triggersService.findOne(id, organizationId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update trigger' })
  update(
    @Param('id') id: string,
    @OrganizationId() organizationId: string,
    @Body() updateDto: UpdateTriggerDto,
  ) {
    return this.triggersService.update(id, organizationId, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete trigger' })
  remove(@Param('id') id: string, @OrganizationId() organizationId: string) {
    return this.triggersService.remove(id, organizationId);
  }

  @Get(':id/executions')
  @ApiOperation({ summary: 'Get trigger execution logs' })
  getExecutions(
    @Param('id') id: string,
    @OrganizationId() organizationId: string,
  ) {
    return this.triggersService.getExecutions(id, organizationId);
  }
}

