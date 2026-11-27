import { Controller, Get, Module as NestModule, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { StaffOnly } from '../../common/decorators/access.decorator.js';
import { canDo, Action, Module } from '../../common/authorization/access.js';
import type { AuthenticatedUser } from '../../common/types/api.types.js';
import { fromCents } from '../../common/money/cents.js';
import { ReceivablesModule } from '../receivables/receivables.module.js';
import { ReceivablesService } from '../receivables/receivables.service.js';
import { OperatorPaymentsModule } from '../operator-payments/operator-payments.module.js';
import { OperatorPaymentsService } from '../operator-payments/operator-payments.service.js';
import { TripsModule } from './trips.module.js';
import { TripsService } from './trips.service.js';
import { uninvoicedCents } from './trips.figures.js';

/** Read orchestration sits above the three owners, so none imports a dependant. */
@ApiTags('Trips')
@StaffOnly()
@Controller('trips')
export class TripOpenItemsController {
  constructor(private readonly trips: TripsService, private readonly payables: OperatorPaymentsService,
    private readonly receivables: ReceivablesService) {}

  @Get(':id/open-items')
  @ApiOperation({ summary: 'Open money before completing a trip', description:
    'Session and trip read scope; 404 outside scope. Warning only: completion is never blocked by open money. ' +
    'Amounts are null without Operator Payments · View or Receivables · View respectively. uninvoicedOpen preserves the warning when its amount is hidden.' })
  async openItems(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    const trip = await this.trips.findOne(user, id);
    const [operator, invoiced] = await Promise.all([
      this.payables.positionOnTrip(id), this.receivables.invoicedCentsByTrip([id]),
    ]);
    const unbilled = trip.totalPrice === null ? null : uninvoicedCents([{ id, totalPrice: trip.totalPrice }], invoiced);
    return {
      operatorUnpaid: operator.balance > 0 || (Boolean(trip.operatorId) && operator.payableCount === 0),
      operatorBalance: canDo(user.access, Module.OPERATOR_PAYMENTS, Action.VIEW) && operator.payableCount > 0 ? operator.balance : null,
      uninvoiced: canDo(user.access, Module.RECEIVABLES, Action.VIEW) && unbilled !== null ? fromCents(unbilled) : null,
      uninvoicedOpen: unbilled !== null && unbilled > 0,
    };
  }
}

@NestModule({ imports: [TripsModule, OperatorPaymentsModule, ReceivablesModule], controllers: [TripOpenItemsController] })
export class TripOpenItemsModule {}
