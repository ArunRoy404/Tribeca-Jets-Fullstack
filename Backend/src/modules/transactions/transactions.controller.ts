import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequireAccess, StaffOnly } from '../../common/decorators/access.decorator.js';
import { AccessGuard } from '../../common/guards/access.guard.js';
import { Action, Module } from '../../common/authorization/access.catalogue.js';
import type { AuthenticatedUser } from '../../common/types/api.types.js';
import { TransactionsService } from './transactions.service.js';
import { QueryTransactionsDto, TransactionStatsDto } from './dto/transaction.dto.js';

/**
 * Transactions (#19, reviewed #25) — the money ledger, read-only.
 *
 * Staff-only desk financials: referral agents / partner roles are refused (403 StaffOnly).
 * Routes require TRANSACTIONS · VIEW (@RequireAccess).
 * Inside, each kind of row is read only if the caller's per-person permissions also include
 * that kind's own module VIEW (RECEIVABLES, OPERATOR_PAYMENTS, COMMISSIONS), and scoped by
 * that module's row-level reach (Reach.OWN vs Reach.ALL).
 *
 * There are no writes: a movement is corrected or withdrawn on the bill it settles.
 */
@ApiTags('Transactions')
@Controller('transactions')
@UseGuards(AccessGuard)
@StaffOnly()
export class TransactionsController {
  constructor(private readonly transactions: TransactionsService) {}

  @Get()
  @RequireAccess(Module.TRANSACTIONS, Action.VIEW)
  @ApiOperation({
    summary: 'The money ledger',
    description:
      'Every payment received (CLIENT_PAYMENT, direction IN), every payment sent to an operator (OPERATOR_PAYMENT, OUT) and every commission paid (COMMISSION, OUT), by the day the money moved. `document` is the bill it settles. A paid commission whose value cannot be known has `amount: null`. Read from each owning module under its own scope; nothing is stored here.',
  })
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryTransactionsDto) {
    return this.transactions.findAll(user, query);
  }

  @Get('stats')
  @RequireAccess(Module.TRANSACTIONS, Action.VIEW)
  @ApiOperation({
    summary: 'Ledger totals',
    description:
      'Money in, money out and the net, summed in cents over the same filters as the list, with a count and total per kind. A side the caller may not see is null, and so is the net.',
  })
  stats(@CurrentUser() user: AuthenticatedUser, @Query() query: TransactionStatsDto) {
    return this.transactions.stats(user, query);
  }
}

