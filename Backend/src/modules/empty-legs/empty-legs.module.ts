import { Module } from '@nestjs/common';
import { TripRequestsModule } from '../trip-requests/trip-requests.module.js';
import { EmptyLegsController } from './empty-legs.controller.js';
import { EmptyLegsService } from './empty-legs.service.js';

/**
 * Reads trip requests through their own service for #10b's matching, so the
 * match list is scoped by the same rule that scopes the requests board.
 */
@Module({
  imports: [TripRequestsModule],
  controllers: [EmptyLegsController],
  providers: [EmptyLegsService],
})
export class EmptyLegsModule {}
