import { Module } from '@nestjs/common';
import { ClientsController } from './clients.controller.js';
import { ClientsService } from './clients.service.js';
import { TripsModule } from '../trips/trips.module.js';
import { AirportsModule } from '../airports/airports.module.js';
import { SettingsModule } from '../settings/settings.module.js';

@Module({
  imports: [TripsModule, AirportsModule, SettingsModule],
  controllers: [ClientsController],
  providers: [ClientsService],
  exports: [ClientsService],
})
export class ClientsModule {}

