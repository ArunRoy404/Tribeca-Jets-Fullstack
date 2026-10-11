import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import {
  RequireAccess,
  StaffOnly,
} from '../../common/decorators/access.decorator.js';
import { Module, Action } from '../../common/authorization/access.catalogue.js';
import type { AuthenticatedUser } from '../../common/types/api.types.js';
import { BulkIdsDto } from '../../common/dto/bulk.dto.js';
import { contentDisposition } from '../uploads/uploads.rules.js';
import { ItinerariesService } from './itineraries.service.js';
import {
  CreateItineraryDto,
  QueryItinerariesDto,
  UpdateItineraryDto,
} from './dto/itinerary.dto.js';

/**
 * Itineraries (#12) — the passenger-facing document for a trip (scope §11).
 *
 * Moved to per-person permissions (Module.ITINERARIES). Open reads for staff
 * sessions; writes guarded via @RequireAccess.
 */
@ApiTags('Itineraries')
@StaffOnly()
@Controller('itineraries')
export class ItinerariesController {
  constructor(private readonly itineraries: ItinerariesService) {}

  @Get()
  @ApiOperation({
    summary: 'List itineraries',
    description:
      'Scoped by the caller\'s reach on Itineraries. Open to all signed-in staff. Aircraft, operator, tail, route and the passenger manifest are read from the trip on every request, never stored here. Search matches the trip\'s reference ("TJ-1048" or "1048"), client, tail and operator.',
  })
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryItinerariesDto) {
    return this.itineraries.findAll(user, query);
  }

  /** Before `:id` — Nest matches in order. */
  @Get('stats')
  @ApiOperation({
    summary: 'Board tiles',
    description: 'Total documents, confirmed, and the pending remainder, within the caller\'s scope.',
  })
  stats(@CurrentUser() user: AuthenticatedUser) {
    return this.itineraries.stats(user);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get one itinerary',
    description: 'Archived documents load too. Outside the caller\'s scope: 404, never 403.',
  })
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.itineraries.findOne(user, id);
  }

  @Get(':id/operator-attachment')
  @Header('X-Content-Type-Options', 'nosniff')
  @ApiOperation({
    summary: 'Open the operator itinerary file',
    description:
      'The file is uploaded PRIVATE; whoever may read the itinerary may open it here via vouched access.',
  })
  @ApiResponse({ status: 200, description: 'The file.' })
  async operatorAttachment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const file = await this.itineraries.openOperatorAttachment(user, id);
    response.setHeader('Content-Type', file.contentType);
    response.setHeader('Content-Length', String(file.size));
    response.setHeader('Content-Disposition', contentDisposition(file));
    return new StreamableFile(file.stream);
  }

  @Post()
  @RequireAccess(Module.ITINERARIES, Action.CREATE)
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
  @RequireAccess(Module.ITINERARIES, Action.ARCHIVE)
  @ApiOperation({ summary: 'Archive several itineraries', description: 'Ids that match nothing come back in `skipped`.' })
  removeMany(@CurrentUser() user: AuthenticatedUser, @Body() body: BulkIdsDto) {
    return this.itineraries.removeMany(user, body.ids);
  }

  @Post('bulk-restore')
  @HttpCode(HttpStatus.OK)
  @RequireAccess(Module.ITINERARIES, Action.ARCHIVE)
  @ApiOperation({ summary: 'Restore several archived itineraries' })
  restoreMany(@CurrentUser() user: AuthenticatedUser, @Body() body: BulkIdsDto) {
    return this.itineraries.restoreMany(user, body.ids);
  }

  @Patch(':id')
  @RequireAccess(Module.ITINERARIES, Action.EDIT)
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
  @RequireAccess(Module.ITINERARIES, Action.EDIT)
  @ApiOperation({ summary: 'Confirm the document', description: 'Idempotent — confirming an already-confirmed document is a no-op.' })
  confirm(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.itineraries.confirm(user, id);
  }

  @Post(':id/send')
  @HttpCode(HttpStatus.OK)
  @RequireAccess(Module.ITINERARIES, Action.SEND)
  @ApiOperation({
    summary: 'Mark the document sent to the client',
    description: 'Stamps who sent it and when. This route sends no email — emailing it is `POST /emails` with the `tripId` (Email Templates, #21) — so it records the act, not the email.',
  })
  send(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.itineraries.send(user, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireAccess(Module.ITINERARIES, Action.ARCHIVE)
  @ApiOperation({ summary: 'Archive a document', description: 'Nothing is deleted; restore brings it back.' })
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.itineraries.remove(user, id);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @RequireAccess(Module.ITINERARIES, Action.ARCHIVE)
  @ApiOperation({ summary: 'Restore an archived document', description: 'Clears the archive stamp and nothing else.' })
  restore(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.itineraries.restore(user, id);
  }
}

