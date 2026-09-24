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
import type { AuthenticatedUser } from '../../common/types/api.types.js';
import { ClientCreditsService } from './client-credits.service.js';
import {
  ClientCreditSummaryDto,
  CreateClientCreditDto,
  QueryClientCreditsDto,
  UpdateClientCreditDto,
} from './dto/client-credit.dto.js';

/**
 * Money a client has on account with us (client adjustment #9).
 *
 * **A ledger, not a number.** The client asked to "enter how much that is and
 * always edit that number or select if it was used towards another trip" —
 * which is two kinds of movement, so these are rows and the balance is summed
 * from them. He gets the edit he asked for, on an entry, plus an audit trail
 * he did not know to ask for.
 *
 * **No `@RequirePermissions` decorator**, the same deliberate choice the
 * uploads and notes modules record: the reach here is `VIEW_FINANCIALS`
 * *combined with* whether the caller can see the client, and the second half
 * is row-level and belongs in the service. Checking only the first in a guard
 * would read as protection while leaving every client's balance one id away.
 * Authentication is still global.
 */
@ApiTags('Client Credits')
@Controller('client-credits')
export class ClientCreditsController {
  constructor(private readonly credits: ClientCreditsService) {}

  /** Before `:id` — Nest matches in order and would read it as an id. */
  @Get('summary')
  @ApiOperation({
    summary: "What a client has on account",
    description:
      'The figures above the ledger: `balance`, `credited`, `applied`, how many movements there are and when the last one was. **Summed on every read and never stored** — a balance kept beside the entries it is computed from contradicts them the first time an entry is edited, and nothing on screen says which half is right. Withdrawn entries count towards nothing, so the total always agrees with the rows printed under it.',
  })
  summary(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ClientCreditSummaryDto,
  ) {
    return this.credits.summary(user, query.clientId);
  }

  @Get()
  @ApiOperation({
    summary: "List a client's credit movements",
    description:
      '`clientId` is required: money on account is only meaningful beside the client holding it, and an unscoped list would be the one query that ignores the row-level rule the client carries. Opens on `occurredAt` descending — the newest *movement*, not the newest row typed in. `archived=true` is the withdrawn half.',
  })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryClientCreditsDto,
  ) {
    return this.credits.findAll(user, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get one credit movement',
    description:
      "Withdrawn entries load here too, so the archived view can link to them. An entry on a client outside the caller's scope returns 404 rather than 403 — a 403 would confirm the client exists, and a list of client ids is not something a balance should help anyone build.",
  })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.credits.findOne(user, id);
  }

  @Post()
  @ApiOperation({
    summary: 'Record money onto or off an account',
    description:
      '`type` carries the direction and `amount` is **always positive** — a signed column invites "-5000" typed into a CREDIT, which reads as a credit and behaves as an application. `occurredAt` is the day the money moved, which is not the day it was entered.\n\nAn APPLICATION beyond the balance is refused with the available figure named: a client cannot spend money they are not holding, so that is a typo — an extra zero, or the same cancellation entered twice.\n\n**"Used towards another trip" carries no trip link yet.** Trips do not exist, and a reference string pointing at nothing would become a migration and a set of broken joins the day the table arrives. Say which trip in `reason` for now.',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateClientCreditDto,
  ) {
    return this.credits.create(user, dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Edit a movement',
    description:
      'The "can always edit that number" half of the request. The balance is re-checked without this row, so raising an application is measured against what the account actually holds rather than against a figure that still contains the old value.\n\n`clientId` cannot be changed: money does not move between clients. An entry filed against the wrong one is withdrawn and re-entered, which leaves the mistake visible on both ledgers instead of silently moving a balance.',
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClientCreditDto,
  ) {
    return this.credits.update(user, id, dto);
  }

  /** 200, not the 201 Nest gives a POST: a restore creates nothing. */
  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Put a withdrawn movement back on the ledger',
    description:
      'The balance is re-checked, because the ledger has moved on. A $12,000 application withdrawn in March and restored in June lands on whatever the account holds now — if the credit behind it was spent meanwhile, restoring would overdraw the client, and a guard that a withdraw-and-restore walks around is not a guard.',
  })
  restore(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.credits.restore(user, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Withdraw a movement (soft)',
    description:
      'It leaves the balance and stays readable in the archived view with the trail of who removed it. Nothing in this system is destroyed — and on a money ledger least of all, where the reason a figure changed is the thing somebody will ask about.',
  })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.credits.remove(user, id);
  }
}
