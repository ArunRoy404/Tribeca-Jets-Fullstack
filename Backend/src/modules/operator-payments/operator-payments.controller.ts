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
import { OperatorPaymentsService } from './operator-payments.service.js';
import {
  CreatePayableDto,
  CreatePaymentDto,
  PayableStatsDto,
  QueryPayablesDto,
  UpdatePayableDto,
  UpdatePaymentDto,
} from './dto/operator-payment.dto.js';

/**
 * Operator Payments (#17) — what Tribeca owes operators for its trips and the
 * money sent against each bill.
 *
 * VIEW_OPERATOR_PAYMENTS reads: every bill for an administrator or senior
 * broker, the bills on their own (and unassigned) trips for a broker.
 * MANAGE_OPERATOR_PAYMENTS writes, and only administrators and senior brokers
 * hold it — money leaving the company, as with commissions.
 */
@ApiTags('Operator Payments')
@Controller('operator-payments')
export class OperatorPaymentsController {
  constructor(private readonly payables: OperatorPaymentsService) {}

  @Get()
  @RequirePermissions(Permission.VIEW_OPERATOR_PAYMENTS)
  @ApiOperation({
    summary: 'List operator bills',
    description:
      '`total`, `paid`, `balance` and `state` are computed on every read from the bill and its live payments; none is stored. `state` is DUE, PARTIALLY_PAID, PAID, OVERDUE (owing, due date passed) or CANCELLED — and is also the filter.',
  })
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryPayablesDto) {
    return this.payables.findAll(user, query);
  }

  /** Before `:id` — Nest matches in order. */
  @Get('stats')
  @RequirePermissions(Permission.VIEW_OPERATOR_PAYMENTS)
  @ApiOperation({
    summary: 'Operator payment totals',
    description:
      'Payable (open bills), paid, outstanding, overdue and due-this-week (owing, due today or in the next six days), summed in cents over the caller\'s scope — optionally one operator or one trip. Cancelled bills are owed to nobody.',
  })
  stats(@CurrentUser() user: AuthenticatedUser, @Query() query: PayableStatsDto) {
    return this.payables.stats(user, query);
  }

  @Get(':id')
  @RequirePermissions(Permission.VIEW_OPERATOR_PAYMENTS)
  @ApiOperation({
    summary: 'Get one operator bill, with its payments',
    description: 'Archived bills included. Outside the caller\'s scope: 404, never 403. `withdrawnPayments` lists payments taken off the record.',
  })
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.payables.findOne(user, id);
  }

  @Post()
  @RequireWritePermissions(Permission.MANAGE_OPERATOR_PAYMENTS)
  @ApiOperation({
    summary: 'Record an operator\'s bill on a trip',
    description: 'On a live trip. `operatorId` defaults to the trip\'s operator; a trip without one needs it named.',
  })
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreatePayableDto) {
    return this.payables.create(user, body);
  }

  @Post('bulk-delete')
  @HttpCode(HttpStatus.OK)
  @RequireWritePermissions(Permission.MANAGE_OPERATOR_PAYMENTS)
  @ApiOperation({
    summary: 'Archive several operator bills',
    description: 'Bills with live payments, and ids that match nothing, come back in `skipped`.',
  })
  removeMany(@CurrentUser() user: AuthenticatedUser, @Body() body: BulkIdsDto) {
    return this.payables.removeMany(user, body.ids);
  }

  @Post('bulk-restore')
  @HttpCode(HttpStatus.OK)
  @RequireWritePermissions(Permission.MANAGE_OPERATOR_PAYMENTS)
  @ApiOperation({ summary: 'Restore several archived operator bills' })
  restoreMany(@CurrentUser() user: AuthenticatedUser, @Body() body: BulkIdsDto) {
    return this.payables.restoreMany(user, body.ids);
  }

  @Patch(':id')
  @RequireWritePermissions(Permission.MANAGE_OPERATOR_PAYMENTS)
  @ApiOperation({
    summary: 'Edit or cancel an operator bill',
    description: 'The amount cannot drop below what has been paid, and a bill with live payments cannot be cancelled. The trip is fixed once recorded.',
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdatePayableDto,
  ) {
    return this.payables.update(user, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireWritePermissions(Permission.MANAGE_OPERATOR_PAYMENTS)
  @ApiOperation({ summary: 'Archive an operator bill', description: 'Only with no live payments. Nothing is deleted.' })
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.payables.remove(user, id);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @RequireWritePermissions(Permission.MANAGE_OPERATOR_PAYMENTS)
  @ApiOperation({ summary: 'Restore an archived operator bill', description: 'Clears the archive stamp and nothing else.' })
  restore(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.payables.restore(user, id);
  }

  // ---- Payments -----------------------------------------------------------

  @Post(':id/payments')
  @RequireWritePermissions(Permission.MANAGE_OPERATOR_PAYMENTS)
  @ApiOperation({
    summary: 'Record money sent to the operator',
    description: 'Never past what the bill still owes, and never on a cancelled bill. `paidAt` defaults to today. Returns the bill.',
  })
  recordPayment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CreatePaymentDto,
  ) {
    return this.payables.recordPayment(user, id, body);
  }

  @Patch(':id/payments/:paymentId')
  @RequireWritePermissions(Permission.MANAGE_OPERATOR_PAYMENTS)
  @ApiOperation({
    summary: 'Correct a recorded payment',
    description: 'A new amount is checked against the bill without this payment in it. Returns the bill.',
  })
  updatePayment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
    @Body() body: UpdatePaymentDto,
  ) {
    return this.payables.updatePayment(user, id, paymentId, body);
  }

  @Delete(':id/payments/:paymentId')
  @HttpCode(HttpStatus.OK)
  @RequireWritePermissions(Permission.MANAGE_OPERATOR_PAYMENTS)
  @ApiOperation({
    summary: 'Withdraw a payment',
    description: 'The payment stays on the record under `withdrawnPayments`. Returns the bill.',
  })
  withdrawPayment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
  ) {
    return this.payables.withdrawPayment(user, id, paymentId);
  }

  @Post(':id/payments/:paymentId/restore')
  @HttpCode(HttpStatus.OK)
  @RequireWritePermissions(Permission.MANAGE_OPERATOR_PAYMENTS)
  @ApiOperation({
    summary: 'Restore a withdrawn payment',
    description: 'Re-checked against the bill as it is now: refused if it would overpay it, or if the bill is cancelled.',
  })
  restorePayment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
  ) {
    return this.payables.restorePayment(user, id, paymentId);
  }
}
