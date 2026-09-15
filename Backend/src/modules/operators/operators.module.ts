import { Module } from '@nestjs/common';
import { OperatorsController } from './operators.controller.js';
import { OperatorsService } from './operators.service.js';

@Module({
  controllers: [OperatorsController],
  providers: [OperatorsService],
  // Exported because Aircraft, sourcing, quotes and operator payments all
  // resolve operators through this service rather than querying the table.
  exports: [OperatorsService],
})
export class OperatorsModule {}
