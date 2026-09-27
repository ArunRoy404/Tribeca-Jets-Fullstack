import { Module } from '@nestjs/common';
import { TripsModule } from '../trips/trips.module.js';
import { ItinerariesController } from './itineraries.controller.js';
import { ItinerariesService } from './itineraries.service.js';

/**
 * Reads the trip it belongs to through `TripsService`, never a raw Prisma
 * call into that module's tables — the same rule Receivables and Operator
 * Payments already follow.
 */
@Module({
  imports: [TripsModule],
  controllers: [ItinerariesController],
  providers: [ItinerariesService],
  exports: [ItinerariesService],
})
export class ItinerariesModule {}
