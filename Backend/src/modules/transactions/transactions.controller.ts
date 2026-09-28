import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { Permission } from '../../common/authorization/permissions.js';
import type { AuthenticatedUser } from '../../common/types/api.types.js';
import { TransactionsService } from './transactions.service.js';
import { QueryTransactionsDto, TransactionStatsDto } from './dto/transaction.dto.js';

/**
 * Transactions (#19) — the money ledger, read-only.
 *
 * VIEW_FINANCIALS opens it (administrators and senior brokers everything, a
 * broker their own). Inside, each kind of row is read only if the caller also
 * holds that kind's own permission — VIEW_RECEIVABLES, VIEW_OPERATOR_PAYMENTS,
 * VIEW_COMMISSIONS — at that module's scope. There are no writes: a movement
 * is corrected or withdrawn on the bill it settles.
 */
@ApiTags('Transactions')
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactions: TransactionsService) {}

  @Get()
  @RequirePermissions(Permission.VIEW_FINANCIALS)
  @ApiOperation({
    summary: 'The money ledger',
    description:
      'Every payment received (CLIENT_PAYMENT, direction IN), every payment sent to an operator (OPERATOR_PAYMENT, OUT) and every commission paid (COMMISSION, OUT), by the day the money moved. `document` is the bill it settles. A paid commission whose value cannot be known has `amount: null`. Read from each owning module under its own scope; nothing is stored here.',
  })
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryTransactionsDto) {
    return this.transactions.findAll(user, query);
  }

  @Get('stats')
  @RequirePermissions(Permission.VIEW_FINANCIALS)
  @ApiOperation({
    summary: 'Ledger totals',
    description:
      'Money in, money out and the net, summed in cents over the same filters as the list, with a count and total per kind. A side the caller may not see is null, and so is the net.',
  })
  stats(@CurrentUser() user: AuthenticatedUser, @Query() query: TransactionStatsDto) {
    return this.transactions.stats(user, query);
  }
}
