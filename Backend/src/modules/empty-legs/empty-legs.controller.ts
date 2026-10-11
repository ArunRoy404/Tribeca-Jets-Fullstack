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
import { BulkIdsDto } from '../../common/dto/bulk.dto.js';
import { EmptyLegsService } from './empty-legs.service.js';
import {
  CreateEmptyLegDto,
  QueryEmptyLegsDto,
  UpdateEmptyLegDto,
} from './dto/empty-leg.dto.js';

/**
 * Empty Legs (scope §6.13) — and client adjustment #10b's matching.
 *
 * Internal desk inventory: open reads for staff sessions, referral agents
 * refused (403 StaffOnly). Writes gated per person by EMPTY_LEGS permissions.
 */
@ApiTags('Empty Legs')
@UseGuards(AccessGuard)
@StaffOnly()
@Controller('empty-legs')
export class EmptyLegsController {
  constructor(private readonly legs: EmptyLegsService) {}

  @Get()
  @ApiOperation({
    summary: 'List empty legs',
    description:
      'Shared inventory — every desk role sees every leg. Filters: status (as read: an open leg past `expiresAt` is EXPIRED), origin, destination, operator. Search matches "EL-1001", airport code/name/city, operator, tail and model. Each row carries `matchCount` and `dateMatchCount`: trip requests on the same route, and those within three days of the departure (#10b), counted within the caller\'s own request scope.',
  })
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryEmptyLegsDto) {
    return this.legs.findAll(user, query);
  }

  /** Before `:id` — Nest matches in order. */
  @Get('stats')
  @ApiOperation({
    summary: 'Empty-leg board tiles',
    description:
      'Available, matched, booked and expired counts (lapsed open legs count as expired), and `openValue` — the sum of the priced open legs — with `pricedOpenCount` saying how many had a price.',
  })
  stats() {
    return this.legs.stats();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get one empty leg, with its matches',
    description:
      '`matches` are the trip requests on the same route — LOST, CONVERTED and archived included, because those are the clients worth calling back (#10b) — date matches (within 3 days) first, each with its client\'s contact details. Scoped to the requests the caller may see. Archived legs load too.',
  })
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.legs.findOne(user, id);
  }

  @Post()
  @RequireAccess(Module.EMPTY_LEGS, Action.CREATE)
  @ApiOperation({
    summary: 'Add an empty leg',
    description: 'Both airports must be live and different. `expiresAt` is when the operator\'s offer lapses.',
  })
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateEmptyLegDto) {
    return this.legs.create(user, body);
  }

  @Post('bulk-delete')
  @HttpCode(HttpStatus.OK)
  @RequireAccess(Module.EMPTY_LEGS, Action.ARCHIVE)
  @ApiOperation({ summary: 'Archive several empty legs', description: 'Ids that match nothing come back in `skipped`.' })
  removeMany(@CurrentUser() user: AuthenticatedUser, @Body() body: BulkIdsDto) {
    return this.legs.removeMany(user, body.ids);
  }

  @Post('bulk-restore')
  @HttpCode(HttpStatus.OK)
  @RequireAccess(Module.EMPTY_LEGS, Action.ARCHIVE)
  @ApiOperation({ summary: 'Restore several archived empty legs' })
  restoreMany(@CurrentUser() user: AuthenticatedUser, @Body() body: BulkIdsDto) {
    return this.legs.restoreMany(user, body.ids);
  }

  @Patch(':id')
  @RequireAccess(Module.EMPTY_LEGS, Action.EDIT)
  @ApiOperation({
    summary: 'Edit an empty leg, or change its status',
    description: 'Only links that change are re-validated. Setting `status` is how Match, Book and Expire are recorded.',
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateEmptyLegDto,
  ) {
    return this.legs.update(user, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireAccess(Module.EMPTY_LEGS, Action.ARCHIVE)
  @ApiOperation({ summary: 'Archive an empty leg', description: 'Nothing is deleted; restore brings it back.' })
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.legs.remove(user, id);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @RequireAccess(Module.EMPTY_LEGS, Action.ARCHIVE)
  @ApiOperation({ summary: 'Restore an archived empty leg', description: 'Clears the archive stamp and nothing else.' })
  restore(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.legs.restore(user, id);
  }
}
