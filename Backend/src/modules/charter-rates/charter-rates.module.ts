import { Module } from '@nestjs/common';
import { AirportsModule } from '../airports/airports.module.js';
import { CharterRatesController } from './charter-rates.controller.js';
import { CharterRatesService } from './charter-rates.service.js';

/**
 * Reads airports through their own service, never a raw query — the
 * coordinates an estimate is built on belong to that module.
 */
@Module({
  imports: [AirportsModule],
  controllers: [CharterRatesController],
  providers: [CharterRatesService],
})
export class CharterRatesModule {}
