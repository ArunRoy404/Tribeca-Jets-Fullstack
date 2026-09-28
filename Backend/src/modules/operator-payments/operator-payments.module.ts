import { Module } from '@nestjs/common';
import { TripsModule } from '../trips/trips.module.js';
import { OperatorPaymentsController } from './operator-payments.controller.js';
import { OperatorPaymentsService } from './operator-payments.service.js';

/**
 * Reads trips — their scope and whether one can be billed — through their own
 * service. Exported for the operators module, whose list and detail show the
 * total paid to each operator. Trips reads its payables back through its own
 * relation and the pure `operator-payments.amounts.ts`, so there is no cycle.
 */
@Module({
  imports: [TripsModule],
  controllers: [OperatorPaymentsController],
  providers: [OperatorPaymentsService],
  exports: [OperatorPaymentsService],
})
export class OperatorPaymentsModule {}
