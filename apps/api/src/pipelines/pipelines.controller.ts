import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PipelinesService } from './pipelines.service';
import { CreatePipelineDto } from './dto/create-pipeline.dto';
import { UpdatePipelineDto } from './dto/update-pipeline.dto';
import { CreateStageDto } from './dto/create-stage.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationId } from '../common/decorators/organization.decorator';

@ApiTags('pipelines')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pipelines')
export class PipelinesController {
  constructor(private readonly pipelinesService: PipelinesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new pipeline' })
  create(@OrganizationId() organizationId: string, @Body() createDto: CreatePipelineDto) {
    return this.pipelinesService.create(organizationId, createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all pipelines' })
  findAll(@OrganizationId() organizationId: string) {
    return this.pipelinesService.findAll(organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get pipeline by ID' })
  findOne(@Param('id') id: string, @OrganizationId() organizationId: string) {
    return this.pipelinesService.findOne(id, organizationId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update pipeline' })
  update(
    @Param('id') id: string,
    @OrganizationId() organizationId: string,
    @Body() updateDto: UpdatePipelineDto,
  ) {
    return this.pipelinesService.update(id, organizationId, updateDto);
  }

  @Post(':id/stages')
  @ApiOperation({ summary: 'Create a new stage' })
  createStage(
    @Param('id') pipelineId: string,
    @OrganizationId() organizationId: string,
    @Body() createDto: CreateStageDto,
  ) {
    return this.pipelinesService.createStage(pipelineId, organizationId, createDto);
  }

  @Patch('stages/:stageId')
  @ApiOperation({ summary: 'Update stage' })
  updateStage(
    @Param('stageId') stageId: string,
    @OrganizationId() organizationId: string,
    @Body() updateDto: Partial<CreateStageDto>,
  ) {
    return this.pipelinesService.updateStage(stageId, organizationId, updateDto);
  }
}

