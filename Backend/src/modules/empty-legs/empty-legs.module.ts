import { Module } from '@nestjs/common';
import { AirportsModule } from '../airports/airports.module.js';
import { TripRequestsModule } from '../trip-requests/trip-requests.module.js';
import { EmptyLegsController } from './empty-legs.controller.js';
import { EmptyLegsService } from './empty-legs.service.js';

/**
 * Reads trip requests through their own service for #10b's matching, and
 * validates airports through AirportsModule.usable.
 */
@Module({
  imports: [TripRequestsModule, AirportsModule],
  controllers: [EmptyLegsController],
  providers: [EmptyLegsService],
  exports: [EmptyLegsService],
})
export class EmptyLegsModule {}
