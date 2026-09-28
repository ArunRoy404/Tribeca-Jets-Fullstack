import { Module } from '@nestjs/common';
import { TripsModule } from '../trips/trips.module.js';
import { CommissionsController } from './commissions.controller.js';
import { CommissionsService } from './commissions.service.js';

/**
 * Reads trips through their own service. Exported for the referrals module,
 * which raises an agent's commission when a referral books a trip.
 */
@Module({
  imports: [TripsModule],
  controllers: [CommissionsController],
  providers: [CommissionsService],
  exports: [CommissionsService],
})
export class CommissionsModule {}
