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
import { ReceivablesService } from './receivables.service.js';
import {
  CreateInvoiceDto,
  CreatePaymentDto,
  QueryInvoicesDto,
  ReceivableStatsDto,
  UpdateInvoiceDto,
  UpdatePaymentDto,
} from './dto/receivable.dto.js';

/**
 * Receivables (#16, reviewed #21) — client invoices on a trip and the payments against them.
 *
 * Internal desk inventory: open reads for staff sessions, referral agents
 * refused (403 StaffOnly). Writes gated per person by RECEIVABLES permissions:
 * Action.CREATE for raising and editing invoices, Action.PAY for recording and
 * updating payments, Action.ARCHIVE for voiding/restoring invoices and payments.
 * Reads are scoped by reachOf(user.access, Module.RECEIVABLES) and
 * TripsService.visibleWhere.
 */
@ApiTags('Receivables')
@UseGuards(AccessGuard)
@StaffOnly()
@Controller('receivables')
export class ReceivablesController {
  constructor(private readonly receivables: ReceivablesService) {}

  @Get()
  @ApiOperation({
    summary: 'List invoices',
    description:
      '`total`, `paid`, `balance` and `state` are computed on every read from the invoice and its live payments; none is stored. `state` is DRAFT, DUE (sent, nothing in, not late), PARTIALLY_PAID, PAID, OVERDUE (sent, balance owing, due date passed) or CANCELLED — and is also the filter.',
  })
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryInvoicesDto) {
    return this.receivables.findAll(user, query);
  }

  /** Before `:id` — Nest matches in order. */
  @Get('stats')
  @ApiOperation({
    summary: 'Receivables totals',
    description:
      'Invoiced (sent invoices), collected (every live payment), outstanding and overdue, summed in cents over the caller\'s scope — optionally one client or one trip. Drafts are not invoiced; cancelled invoices are owed by nobody.',
  })
  stats(@CurrentUser() user: AuthenticatedUser, @Query() query: ReceivableStatsDto) {
    return this.receivables.stats(user, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get one invoice, with its payments',
    description: 'Archived invoices included. Outside the caller\'s scope: 404, never 403. `withdrawnPayments` lists payments taken off the record, with who withdrew them.',
  })
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.receivables.findOne(user, id);
  }

  @Post()
  @RequireAccess(Module.RECEIVABLES, Action.CREATE)
  @ApiOperation({
    summary: 'Raise an invoice on a trip',
    description:
      'On a live trip the caller may see. `clientId` defaults to the trip\'s client. Born DRAFT or SENT; a SENT invoice with no `issuedAt` is dated today.',
  })
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateInvoiceDto) {
    return this.receivables.create(user, body);
  }

  @Post('bulk-delete')
  @HttpCode(HttpStatus.OK)
  @RequireAccess(Module.RECEIVABLES, Action.ARCHIVE)
  @ApiOperation({
    summary: 'Archive several invoices',
    description: 'Administrators and senior brokers only. Invoices with live payments, and ids that match nothing, come back in `skipped`.',
  })
  removeMany(@CurrentUser() user: AuthenticatedUser, @Body() body: BulkIdsDto) {
    return this.receivables.removeMany(user, body.ids);
  }

  @Post('bulk-restore')
  @HttpCode(HttpStatus.OK)
  @RequireAccess(Module.RECEIVABLES, Action.ARCHIVE)
  @ApiOperation({ summary: 'Restore several archived invoices', description: 'Administrators and senior brokers only.' })
  restoreMany(@CurrentUser() user: AuthenticatedUser, @Body() body: BulkIdsDto) {
    return this.receivables.restoreMany(user, body.ids);
  }

  @Patch(':id')
  @RequireAccess(Module.RECEIVABLES, Action.CREATE)
  @ApiOperation({
    summary: 'Edit an invoice, send it or cancel it',
    description:
      'The total cannot drop below what has been paid. An invoice with live payments cannot go back to DRAFT or be CANCELLED. Moving to SENT with no `issuedAt` dates it today; moving to DRAFT clears it. The trip is fixed once raised.',
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateInvoiceDto,
  ) {
    return this.receivables.update(user, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireAccess(Module.RECEIVABLES, Action.ARCHIVE)
  @ApiOperation({
    summary: 'Archive an invoice',
    description: 'Administrators and senior brokers only, and only with no live payments. Nothing is deleted; restore brings it back.',
  })
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.receivables.remove(user, id);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @RequireAccess(Module.RECEIVABLES, Action.ARCHIVE)
  @ApiOperation({ summary: 'Restore an archived invoice', description: 'Clears the archive stamp and nothing else.' })
  restore(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.receivables.restore(user, id);
  }

  // ---- Payments -----------------------------------------------------------

  @Post(':id/payments')
  @RequireAccess(Module.RECEIVABLES, Action.PAY)
  @ApiOperation({
    summary: 'Record a payment against an invoice',
    description:
      'Only on a SENT invoice, and never past what is still owed — an overpayment belongs on the client\'s credit. `paidAt` defaults to today. Returns the invoice with its new figures.',
  })
  recordPayment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CreatePaymentDto,
  ) {
    return this.receivables.recordPayment(user, id, body);
  }

  @Patch(':id/payments/:paymentId')
  @RequireAccess(Module.RECEIVABLES, Action.PAY)
  @ApiOperation({
    summary: 'Correct a recorded payment',
    description: 'A new amount is checked against the invoice without this payment in it. Returns the invoice.',
  })
  updatePayment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
    @Body() body: UpdatePaymentDto,
  ) {
    return this.receivables.updatePayment(user, id, paymentId, body);
  }

  @Delete(':id/payments/:paymentId')
  @HttpCode(HttpStatus.OK)
  @RequireAccess(Module.RECEIVABLES, Action.ARCHIVE)
  @ApiOperation({
    summary: 'Withdraw a payment',
    description: 'Administrators and senior brokers only. The payment stays on the record under `withdrawnPayments`. Returns the invoice.',
  })
  withdrawPayment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
  ) {
    return this.receivables.withdrawPayment(user, id, paymentId);
  }

  @Post(':id/payments/:paymentId/restore')
  @HttpCode(HttpStatus.OK)
  @RequireAccess(Module.RECEIVABLES, Action.ARCHIVE)
  @ApiOperation({
    summary: 'Restore a withdrawn payment',
    description: 'Administrators and senior brokers only. Re-checked against the invoice as it is now: refused if it would overpay it, or if the invoice is no longer SENT.',
  })
  restorePayment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
  ) {
    return this.receivables.restorePayment(user, id, paymentId);
  }
}
