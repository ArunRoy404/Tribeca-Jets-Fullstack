import { Module } from '@nestjs/common';
import { OperatorQuotesController } from './operator-quotes.controller.js';
import { OperatorQuotesService } from './operator-quotes.service.js';

@Module({
  controllers: [OperatorQuotesController],
  providers: [OperatorQuotesService],
  // Exported because the sourcing board's per-enquiry counts — operators
  // contacted, responses in, best price, how far sourcing has got — are
  // counted here and read by the trip requests module, rather than that module
  // querying this table directly.
  exports: [OperatorQuotesService],
})
export class OperatorQuotesModule {}
