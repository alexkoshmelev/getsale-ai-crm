import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AgentsService } from './agents.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationId } from '../common/decorators/organization.decorator';

@ApiTags('agents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new AI agent' })
  create(@OrganizationId() organizationId: string, @Body() createDto: CreateAgentDto) {
    return this.agentsService.create(organizationId, createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all AI agents' })
  findAll(@OrganizationId() organizationId: string) {
    return this.agentsService.findAll(organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get agent by ID' })
  findOne(@Param('id') id: string, @OrganizationId() organizationId: string) {
    return this.agentsService.findOne(id, organizationId);
  }

  @Get(':id/executions')
  @ApiOperation({ summary: 'Get agent executions' })
  getExecutions(
    @Param('id') id: string,
    @OrganizationId() organizationId: string,
    @Query('limit') limit?: string,
  ) {
    return this.agentsService.getExecutions(
      id,
      organizationId,
      limit ? parseInt(limit) : 20,
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update agent' })
  update(
    @Param('id') id: string,
    @OrganizationId() organizationId: string,
    @Body() updateDto: UpdateAgentDto,
  ) {
    return this.agentsService.update(id, organizationId, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete agent' })
  remove(@Param('id') id: string, @OrganizationId() organizationId: string) {
    return this.agentsService.remove(id, organizationId);
  }
}

