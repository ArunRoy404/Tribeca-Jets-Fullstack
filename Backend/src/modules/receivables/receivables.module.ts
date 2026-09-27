import { Module } from '@nestjs/common';
import { TripsModule } from '../trips/trips.module.js';
import { ReceivablesController } from './receivables.controller.js';
import { ReceivablesService } from './receivables.service.js';

/**
 * Reads trips — their scope and whether one can be invoiced — through their
 * own service. Trips reads its invoices back through its own relation and the
 * pure `receivables.amounts.ts`, so neither module imports the other's DI
 * graph and there is no cycle.
 */
@Module({
  imports: [TripsModule],
  controllers: [ReceivablesController],
  providers: [ReceivablesService],
  exports: [ReceivablesService],
})
export class ReceivablesModule {}
