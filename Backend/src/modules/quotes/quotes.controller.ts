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
import { QuotesService } from './quotes.service.js';
import {
  CreateQuoteDto,
  DecideQuoteDto,
  QueryQuotesDto,
  SendQuoteDto,
  UpdateQuoteDto,
} from './dto/quote.dto.js';

/**
 * Client quotes — the offer the client is shown, with margin and Federal
 * Excise Tax on top of what the operator charges (scope §6.10).
 *
 * The seam with Operator Sourcing (#9) is deliberate: an `OperatorQuote` is
 * what an operator charges *us*, and a `Quote` is what the client pays. One
 * does not become the other automatically, because the markup is the desk's
 * decision.
 *
 * Uses the trips permissions, like trip requests and sourcing — a quote is a
 * stage of a trip, not a capability a role is granted on its own. `VIEW_TRIPS`
 * to read, `MANAGE_TRIPS` to write, `DELETE_TRIPS` (administrators only) to
 * archive. The **margin** carries a second gate: `VIEW_FINANCIALS`, which an
 * assistant does not hold, so the cost and profit figures are simply absent
 * from their responses rather than zeroed.
 *
 * Every state change has its own endpoint rather than riding on PATCH. Sending
 * stamps the date the client's decision window runs from, and approving has to
 * refuse a second approval on the same enquiry — a PATCH accepting `status`
 * would walk straight past both.
 */
@ApiTags('Quotes')
@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotes: QuotesService) {}

  @Get()
  @RequirePermissions(Permission.VIEW_TRIPS)
  @ApiOperation({
    summary: 'List client quotes',
    description:
      'A broker sees the quotes assigned to them plus any unassigned; a senior broker or administrator sees the desk’s. Pass `openOnly=true` for the ones still waiting on the client, `expired=true` for live offers whose validity date has passed, or `archived=true` for the Archived tab.',
  })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryQuotesDto,
  ) {
    return this.quotes.findAll(user, query);
  }

  /** Before `:id` — Nest matches in order and would read it as an id. */
  @Get('stats')
  @RequirePermissions(Permission.VIEW_TRIPS)
  @ApiOperation({
    summary: 'Quote tiles',
    description:
      'Counts per status, the total value of live quotes and the average margin, all counted from the quotes in the caller’s scope. `averageMargin` is null for a caller without VIEW_FINANCIALS, and null — not zero — when nothing has an operator cost recorded yet.',
  })
  stats(@CurrentUser() user: AuthenticatedUser) {
    return this.quotes.stats(user);
  }

  @Get(':id')
  @RequirePermissions(Permission.VIEW_TRIPS)
  @ApiOperation({
    summary: 'One quote',
    description:
      'Archived quotes load here too — the Archived tab links straight to this page. A quote outside the caller’s scope returns 404 rather than 403, because a 403 confirms it exists.',
  })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.quotes.findOne(user, id);
  }

  @Get(':id/versions')
  @RequirePermissions(Permission.VIEW_TRIPS)
  @ApiOperation({
    summary: 'Version history',
    description:
      'Every revision of the offer, newest first, with the figures exactly as they stood at the time. Nothing here is recomputed — that is what makes it a record of what the client was actually shown.',
  })
  versions(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.quotes.versionsFor(user, id);
  }

  @Post()
  @RequireWritePermissions(Permission.MANAGE_TRIPS)
  @ApiOperation({
    summary: 'Write a quote',
    description:
      'Always created as a DRAFT at version 1 — nothing reaches a client by being saved. Pass `operatorQuoteId` to build it on a sourced operator price, which is what makes the margin traceable.',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateQuoteDto,
  ) {
    return this.quotes.create(user, body);
  }

  @Patch(':id')
  @RequireWritePermissions(Permission.MANAGE_TRIPS)
  @ApiOperation({
    summary: 'Edit a quote',
    description:
      'An edit that moves the money cuts a new version and records `versionNote`; one that does not leaves the version alone. An approved or rejected quote must be reopened first — changing it in place would rewrite what the client agreed to.',
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateQuoteDto,
  ) {
    return this.quotes.update(user, id, body);
  }

  @Post(':id/send')
  @HttpCode(HttpStatus.OK)
  @RequireWritePermissions(Permission.MANAGE_TRIPS)
  @ApiOperation({
    summary: 'Send it to the client',
    description:
      'Marks the quote SENT and stamps the date, and moves the enquiry behind it to QUOTED. **No email is sent** — nothing in this system delivers to a client yet; that arrives with Email Templates (#21).',
  })
  send(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SendQuoteDto,
  ) {
    return this.quotes.send(user, id, body);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @RequireWritePermissions(Permission.MANAGE_TRIPS)
  @ApiOperation({
    summary: 'The client accepted',
    description:
      'Only one quote per enquiry can be approved; a second is refused by name rather than demoting the first. A draft cannot be approved — there is nothing the client has seen. An expired quote can be, because honouring a lapsed price is a real decision.',
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
    summary: 'The client declined',
    description:
      'The note is what the next quote to this client is priced against — "went with a cheaper operator" is worth more than the rejection itself.',
  })
  reject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: DecideQuoteDto,
  ) {
    return this.quotes.reject(user, id, body);
  }

  @Post(':id/expire')
  @HttpCode(HttpStatus.OK)
  @RequireWritePermissions(Permission.MANAGE_TRIPS)
  @ApiOperation({
    summary: 'Let the offer lapse',
    description:
      'Explicit, never a background job: the `isExpired` flag on every read already tells the truth about the date, and letting a price go is a decision a person makes.',
  })
  expire(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: DecideQuoteDto,
  ) {
    return this.quotes.expire(user, id, body);
  }

  @Post(':id/reopen')
  @HttpCode(HttpStatus.OK)
  @RequireWritePermissions(Permission.MANAGE_TRIPS)
  @ApiOperation({
    summary: 'Undo a decision',
    description:
      'Returns the quote to where it was — SENT if the client has seen it, DRAFT if it never went out. A quote the client has read cannot become unsent.',
  })
  reopen(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.quotes.reopen(user, id);
  }

  @Post(':id/duplicate')
  @RequireWritePermissions(Permission.MANAGE_TRIPS)
  @ApiOperation({
    summary: 'Copy into a new draft',
    description:
      'A fresh DRAFT at version 1 with the same route, aircraft and pricing, and none of the original’s send or decision history. The desk quotes the same route repeatedly, and re-entering nine fields is where a wrong airport gets typed.',
  })
  duplicate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.quotes.duplicate(user, id);
  }

  @Post('bulk-delete')
  @HttpCode(HttpStatus.OK)
  @RequireWritePermissions(Permission.DELETE_TRIPS)
  @ApiOperation({
    summary: 'Archive several quotes',
    description:
      'POST, not DELETE — a request body on DELETE is dropped by proxies, and a dropped body archives nothing while answering 200. Ids that match nothing come back in `skipped`: two people clearing the same rows both deserve to succeed.',
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
  @ApiOperation({ summary: 'Restore several quotes' })
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
    summary: 'Restore one quote',
    description:
      '200, not 201: a restore creates nothing. It clears the deletion stamp on a row that existed all along.',
  })
  restore(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.quotes.restore(user, id);
  }

  @Delete(':id')
  @RequireWritePermissions(Permission.DELETE_TRIPS)
  @ApiOperation({
    summary: 'Archive a quote',
    description:
      'Soft delete — nothing in this system is destroyed. Administrators only: a quote the client turned down is evidence, and a broker quietly removing their rejections improves their own conversion rate.',
  })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.quotes.remove(user, id);
  }
}
