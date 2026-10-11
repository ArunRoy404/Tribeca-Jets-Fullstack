import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequireAccess, StaffOnly } from '../../common/decorators/access.decorator.js';
import { AccessGuard } from '../../common/guards/access.guard.js';
import { Action, Module } from '../../common/authorization/access.catalogue.js';
import type { AuthenticatedUser } from '../../common/types/api.types.js';
import { TasksService } from './tasks.service.js';
import { CreateTaskDto, QueryTasksDto, UpdateTaskDto } from './dto/task.dto.js';

/**
 * Tasks Board (#20).
 * Reads are open to signed-in staff and scoped by Reach (ALL for Admins,
 * ASSIGNED / OWN for Brokers & Assistants).
 * Writes require granular per-person permissions under Module.TASKS.
 */
@ApiTags('Tasks')
@UseGuards(AccessGuard)
@StaffOnly()
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get()
  @ApiOperation({
    summary: 'List tasks',
    description:
      'Soonest due first, undated last — a board reads that way, a stated exception to newest-first. `view` narrows to MINE, DUE_TODAY, OVERDUE, HIGH_PRIORITY or ATTENTION (due today or overdue). `attention` on each row is worked out from the due date and status on this read, never stored. `archived=true` lists the archived half.',
  })
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryTasksDto) {
    return this.tasks.findAll(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'One task', description: 'Archived tasks load too.' })
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.tasks.findOne(user, id);
  }

  @Post()
  @RequireAccess(Module.TASKS, Action.CREATE)
  @ApiOperation({
    summary: 'Add a task',
    description:
      'The assignee must be a staff member who is not suspended; a client and a trip must be ones you may see. 400 names the problem.',
  })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateTaskDto) {
    return this.tasks.create(user, dto);
  }

  @Patch(':id')
  @RequireAccess(Module.TASKS, Action.EDIT)
  @ApiOperation({
    summary: 'Edit a task, or move it to another column',
    description:
      'Only the fields sent change; `null` clears. Moving into COMPLETED stamps `completedAt`, and moving out clears it. `checklist`, when sent, is the full list.',
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasks.update(user, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireAccess(Module.TASKS, Action.ARCHIVE)
  @ApiOperation({
    summary: 'Archive a task',
    description: 'Its author or an administrator. Nothing is deleted — restore brings it back.',
  })
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.tasks.remove(user, id);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @RequireAccess(Module.TASKS, Action.ARCHIVE)
  @ApiOperation({ summary: 'Restore an archived task', description: 'Its author or an administrator.' })
  restore(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.tasks.restore(user, id);
  }
}

