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
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import {
  RequirePermissions,
  RequireWritePermissions,
} from '../../common/decorators/permissions.decorator.js';
import { Permission } from '../../common/authorization/permissions.js';
import type { AuthenticatedUser } from '../../common/types/api.types.js';
import { BulkIdsDto } from '../../common/dto/bulk.dto.js';
import { ItinerariesService } from './itineraries.service.js';
import { CreateItineraryDto, QueryItinerariesDto, UpdateItineraryDto } from './dto/itinerary.dto.js';

/**
 * Itineraries (#12) — the passenger-facing document for a trip (scope §11).
 *
 * Carries no permission of its own: it uses VIEW_TRIPS / MANAGE_TRIPS, the
 * same rule Trip Requests already applies — a document is part of the trip it
 * is for, not a separate capability. Archiving and restoring stay at
 * MANAGE_TRIPS too, narrower than a trip's own DELETE_TRIPS: this is a
 * document a broker built, not the financial record of the booking itself.
 */
@ApiTags('Itineraries')
@Controller('itineraries')
export class ItinerariesController {
  constructor(private readonly itineraries: ItinerariesService) {}

  @Get()
  @RequirePermissions(Permission.VIEW_TRIPS)
  @ApiOperation({
    summary: 'List itineraries',
    description:
      'Scoped exactly like the trips they belong to — a broker sees the documents on their own and unassigned trips. Aircraft, operator, tail, route and the passenger manifest are read from the trip on every request, never stored here. Search matches the trip\'s reference ("TJ-1048" or "1048"), client, tail and operator.',
  })
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryItinerariesDto) {
    return this.itineraries.findAll(user, query);
  }

  /** Before `:id` — Nest matches in order. */
  @Get('stats')
  @RequirePermissions(Permission.VIEW_TRIPS)
  @ApiOperation({
    summary: 'Board tiles',
    description: 'Total documents, confirmed, and the pending remainder, within the caller\'s scope.',
  })
  stats(@CurrentUser() user: AuthenticatedUser) {
    return this.itineraries.stats(user);
  }

  @Get(':id')
  @RequirePermissions(Permission.VIEW_TRIPS)
  @ApiOperation({
    summary: 'Get one itinerary',
    description: 'Archived documents load too. Outside the caller\'s scope: 404, never 403.',
  })
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.itineraries.findOne(user, id);
  }

  @Post()
  @RequireWritePermissions(Permission.MANAGE_TRIPS)
  @ApiOperation({
    summary: 'Build a document for a trip',
    description:
      'One document per trip — a second attempt on the same trip is a 409 naming the existing one. Aircraft, operator, route, dates and passengers are never sent here; they come from the trip named by `tripId`.',
  })
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateItineraryDto) {
    return this.itineraries.create(user, body);
  }

  @Post('bulk-delete')
  @HttpCode(HttpStatus.OK)
  @RequireWritePermissions(Permission.MANAGE_TRIPS)
  @ApiOperation({ summary: 'Archive several itineraries', description: 'Ids that match nothing come back in `skipped`.' })
  removeMany(@CurrentUser() user: AuthenticatedUser, @Body() body: BulkIdsDto) {
    return this.itineraries.removeMany(user, body.ids);
  }

  @Post('bulk-restore')
  @HttpCode(HttpStatus.OK)
  @RequireWritePermissions(Permission.MANAGE_TRIPS)
  @ApiOperation({ summary: 'Restore several archived itineraries' })
  restoreMany(@CurrentUser() user: AuthenticatedUser, @Body() body: BulkIdsDto) {
    return this.itineraries.restoreMany(user, body.ids);
  }

  @Patch(':id')
  @RequireWritePermissions(Permission.MANAGE_TRIPS)
  @ApiOperation({
    summary: 'Edit a document',
    description:
      'Every field optional; `null` clears it. Refused with a 400 naming the reason while the underlying trip is archived — restore the trip first.',
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateItineraryDto,
  ) {
    return this.itineraries.update(user, id, body);
  }

  @Post(':id/confirm')
  @HttpCode(HttpStatus.OK)
  @RequireWritePermissions(Permission.MANAGE_TRIPS)
  @ApiOperation({ summary: 'Confirm the document', description: 'Idempotent — confirming an already-confirmed document is a no-op.' })
  confirm(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.itineraries.confirm(user, id);
  }

  @Post(':id/send')
  @HttpCode(HttpStatus.OK)
  @RequireWritePermissions(Permission.MANAGE_TRIPS)
  @ApiOperation({
    summary: 'Mark the document sent to the client',
    description: 'Stamps who sent it and when. This route sends no email — emailing it is `POST /emails` with the `tripId` (Email Templates, #21) — so it records the act, not the email.',
  })
  send(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.itineraries.send(user, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireWritePermissions(Permission.MANAGE_TRIPS)
  @ApiOperation({ summary: 'Archive a document', description: 'Nothing is deleted; restore brings it back.' })
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.itineraries.remove(user, id);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @RequireWritePermissions(Permission.MANAGE_TRIPS)
  @ApiOperation({ summary: 'Restore an archived document', description: 'Clears the archive stamp and nothing else.' })
  restore(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.itineraries.restore(user, id);
  }
}
