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
import { DealsService } from './deals.service';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationId } from '../common/decorators/organization.decorator';

@ApiTags('deals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('deals')
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new deal' })
  create(@OrganizationId() organizationId: string, @Body() createDto: CreateDealDto) {
    return this.dealsService.create(organizationId, createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all deals' })
  findAll(
    @OrganizationId() organizationId: string,
    @Query('pipelineId') pipelineId?: string,
    @Query('stageId') stageId?: string,
  ) {
    return this.dealsService.findAll(organizationId, pipelineId, stageId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get deal by ID' })
  findOne(@Param('id') id: string, @OrganizationId() organizationId: string) {
    return this.dealsService.findOne(id, organizationId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update deal' })
  update(
    @Param('id') id: string,
    @OrganizationId() organizationId: string,
    @Body() updateDto: UpdateDealDto,
  ) {
    return this.dealsService.update(id, organizationId, updateDto);
  }

  @Patch(':id/stage')
  @ApiOperation({ summary: 'Update deal stage' })
  updateStage(
    @Param('id') id: string,
    @OrganizationId() organizationId: string,
    @Body('stageId') stageId: string,
  ) {
    return this.dealsService.updateStage(id, organizationId, stageId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete deal' })
  remove(@Param('id') id: string, @OrganizationId() organizationId: string) {
    return this.dealsService.remove(id, organizationId);
  }
}

