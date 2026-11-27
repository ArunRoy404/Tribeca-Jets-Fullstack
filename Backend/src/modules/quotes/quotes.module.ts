import { Module, forwardRef } from '@nestjs/common';
import { ClientsModule } from '../clients/clients.module.js';
import { AirportsModule } from '../airports/airports.module.js';
import { QuotesController } from './quotes.controller.js';
import { QuotesService } from './quotes.service.js';

@Module({
  imports: [AirportsModule, forwardRef(() => ClientsModule)],
  controllers: [QuotesController],
  providers: [QuotesService],
  // Exported for the second pass: the client detail page's Quotes tab, the
  // trip request's "what did we offer", and Trips (#11), which turns an
  // approved quote into a booking.
  exports: [QuotesService],
})
export class QuotesModule {}
