import { Module } from '@nestjs/common';
import { ClientsModule } from '../clients/clients.module.js';
import { TripRequestsModule } from '../trip-requests/trip-requests.module.js';
import { TripsModule } from '../trips/trips.module.js';
import { CommissionsModule } from '../commissions/commissions.module.js';
import { UploadsModule } from '../uploads/uploads.module.js';
import { ReferralResourcesController, ReferralsController } from './referrals.controller.js';
import { ReferralsService } from './referrals.service.js';
import { ReferralResourcesService } from './referral-resources.service.js';

/**
 * Converting a referral creates its client and trip request through their
 * own services; booking one raises the agent's commission through the
 * commissions service. Exported for notes (the REFERRAL subject). Imports
 * nothing that imports it.
 */
@Module({
  imports: [ClientsModule, TripRequestsModule, TripsModule, CommissionsModule, UploadsModule],
  controllers: [ReferralsController, ReferralResourcesController],
  providers: [ReferralsService, ReferralResourcesService],
  exports: [ReferralsService],
})
export class ReferralsModule {}
