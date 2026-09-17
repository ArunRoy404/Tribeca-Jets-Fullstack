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
import { OperatorQuotesService } from './operator-quotes.service.js';
import {
  CreateOperatorQuoteDto,
  DecideQuoteDto,
  QueryOperatorQuotesDto,
  RecordResponseDto,
  UpdateOperatorQuoteDto,
} from './dto/operator-quote.dto.js';

/**
 * Operator sourcing — asking operators to price an enquiry, and comparing what
 * comes back (scope §6.7 and §6.9).
 *
 * Uses the trips permissions rather than a new pair, for the same reason trip
 * requests do: sourcing is a stage of a trip, not a separate thing a role
 * might be granted on its own. `VIEW_TRIPS` to read, `MANAGE_TRIPS` to write,
 * `DELETE_TRIPS` (administrators only) to archive.
 *
 * The state changes have their own endpoints rather than riding on PATCH.
 * Approving has to check that no other quote on the enquiry is already
 * approved, and recording a response has to stamp the clock the operator
 * scorecard is measured with — a PATCH that accepted `status` would walk past
 * both.
 */
@ApiTags('Operator Sourcing')
@Controller('operator-quotes')
export class OperatorQuotesController {
  constructor(private readonly quotes: OperatorQuotesService) {}

  @Get()
  @RequirePermissions(Permission.VIEW_TRIPS)
  @ApiOperation({
    summary: 'List operator quotes',
    description:
      'Scoped through the enquiry: a broker sees quotes on the requests assigned to them plus any unassigned. Pass `tripRequestId` for one enquiry’s comparison view, or `openOnly=true` for the quotes still waiting on an answer or a decision.',
  })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryOperatorQuotesDto,
  ) {
    return this.quotes.findAll(user, query);
  }

  /** Before `:id` — Nest matches in order and would read it as an id. */
  @Get('stats')
  @RequirePermissions(Permission.VIEW_TRIPS)
  @ApiOperation({
    summary: 'Sourcing tiles',
    description:
      'Counts by state plus the average response time in hours. The average is null, never 0, when nothing has been answered yet — a desk that has just started sourcing has no response time, and 0 would read as instant.',
  })
  stats(@CurrentUser() user: AuthenticatedUser) {
    return this.quotes.stats(user);
  }

  @Get(':id')
  @RequirePermissions(Permission.VIEW_TRIPS)
  @ApiOperation({
    summary: 'Get one quote',
    description:
      'Archived quotes load here too, because the Archived tab links straight to them. A quote outside the caller’s scope returns 404 rather than 403.',
  })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.quotes.findOne(user, id);
  }

  @Post()
  @RequireWritePermissions(Permission.MANAGE_TRIPS)
  @ApiOperation({
    summary: 'Ask an operator to quote',
    description:
      'Creates the ask and moves the enquiry to SOURCING. A price may be sent with it — a broker who got the number on the call would otherwise have to record a response a second later and log a response time of zero for a quote that took a day. Asking the same operator twice for one request returns 409.',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateOperatorQuoteDto,
  ) {
    return this.quotes.create(user, body);
  }

  @Patch(':id')
  @RequireWritePermissions(Permission.MANAGE_TRIPS)
  @ApiOperation({
    summary: 'Edit a quote',
    description:
      'Corrects the ask or the recorded answer. Does not move the quote’s state and does not accept `status` — use the response and decision endpoints, which enforce the rules those transitions carry.',
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateOperatorQuoteDto,
  ) {
    return this.quotes.update(user, id, body);
  }

  @Post(':id/response')
  @HttpCode(HttpStatus.OK)
  @RequireWritePermissions(Permission.MANAGE_TRIPS)
  @ApiOperation({
    summary: 'Record the operator’s response',
    description:
      'Stamps the response clock once and never again, so a later correction cannot restart it and flatter the operator. Refused on a quote already approved, rejected or declined — reopen it first.',
  })
  recordResponse(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RecordResponseDto,
  ) {
    return this.quotes.recordResponse(user, id, body);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @RequireWritePermissions(Permission.MANAGE_TRIPS)
  @ApiOperation({
    summary: 'Approve a quote',
    description:
      'Chooses this operator for the trip and moves the enquiry to QUOTED. Only one quote per request can be approved: a second attempt returns 409 naming the operator already chosen, rather than silently demoting them — two approved quotes would mean two operators booked for one flight.',
  })
  approve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: DecideQuoteDto,
  ) {
    return this.quotes.approve(user, id, body);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @RequireWritePermissions(Permission.MANAGE_TRIPS)
  @ApiOperation({
    summary: 'Reject a quote',
    description:
      'The broker rules this one out. It stays in the comparison and in the operator’s scorecard — that is the difference between rejecting a quote and archiving it.',
  })
  reject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: DecideQuoteDto,
  ) {
    return this.quotes.reject(user, id, body);
  }

  @Post(':id/decline')
  @HttpCode(HttpStatus.OK)
  @RequireWritePermissions(Permission.MANAGE_TRIPS)
  @ApiOperation({
    summary: 'Record that the operator declined',
    description:
      'The operator came back and said no. Kept distinct from a rejection: one counts against their availability, the other against their price. Both count as a reply, so neither hides from their response rate.',
  })
  decline(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: DecideQuoteDto,
  ) {
    return this.quotes.decline(user, id, body);
  }

  @Post(':id/reopen')
  @HttpCode(HttpStatus.OK)
  @RequireWritePermissions(Permission.MANAGE_TRIPS)
  @ApiOperation({
    summary: 'Undo a decision',
    description:
      'Returns an approved, rejected or declined quote to where it was. Without this a mis-click on Approve is unfixable, because the board disables both buttons once a quote is decided.',
  })
  reopen(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.quotes.reopen(user, id);
  }

  @Post('bulk-delete')
  @HttpCode(HttpStatus.OK)
  @RequireWritePermissions(Permission.DELETE_TRIPS)
  @ApiOperation({
    summary: 'Archive several quotes',
    description:
      'Administrators only. A broker who has stopped working a quote rejects it — removing it would quietly improve their own sourcing numbers.',
  })
  removeMany(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: BulkIdsDto,
  ) {
    return this.quotes.removeMany(user, body.ids);
  }

  @Post('bulk-restore')
  @HttpCode(HttpStatus.OK)
  @RequireWritePermissions(Permission.DELETE_TRIPS)
  @ApiOperation({
    summary: 'Restore several quotes',
    description:
      'Any whose operator has since been asked again for the same request are reported as skipped rather than failing the batch — one live ask per operator per enquiry.',
  })
  restoreMany(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: BulkIdsDto,
  ) {
    return this.quotes.restoreMany(user, body.ids);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @RequireWritePermissions(Permission.DELETE_TRIPS)
  @ApiOperation({
    summary: 'Restore a quote',
    description:
      'Returns 409 if the operator has since been asked again for this request, rather than surfacing a constraint violation.',
  })
  restore(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.quotes.restore(user, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireWritePermissions(Permission.DELETE_TRIPS)
  @ApiOperation({
    summary: 'Archive a quote',
    description:
      'Soft delete. Administrators only, and never the way to say "we are not going with them" — that is Reject, which keeps the quote in the comparison.',
  })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.quotes.remove(user, id);
  }
}
