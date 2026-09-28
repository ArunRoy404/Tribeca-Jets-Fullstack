import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import {
  RequirePermissions,
  RequireWritePermissions,
} from '../../common/decorators/permissions.decorator.js';
import { Permission } from '../../common/authorization/permissions.js';
import type { AuthenticatedUser } from '../../common/types/api.types.js';
import { CharterRatesService } from './charter-rates.service.js';
import {
  CharterRateParamDto,
  EstimateDto,
  QueryCharterRatesDto,
  SetCharterRateDto,
} from './dto/charter-rate.dto.js';

/**
 * The instant quote calculator's data — client adjustment #6: "put in size of
 * plane, airports and such and it give is an estimate of what it could cost".
 *
 * The rates are the desk's own, typed in here; nothing is invented or
 * AI-estimated (scope §18). A category nobody has priced has no estimate, and
 * says so.
 */
@ApiTags('Charter Rates')
@Controller('charter-rates')
export class CharterRatesController {
  constructor(private readonly rates: CharterRatesService) {}

  @Get()
  @RequirePermissions(Permission.VIEW_FINANCIALS)
  @ApiOperation({
    summary: 'The rate table, one row per aircraft category',
    description:
      'Every category is listed, including ones with no rate on file (all figures `null`) — hiding them would hide the fact that they cannot be estimated. Needs VIEW_FINANCIALS: an hourly rate is what the desk expects to pay, which is margin information.',
  })
  findAll(@Query() query: QueryCharterRatesDto) {
    return this.rates.findAll(query);
  }

  @Post('estimate')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.VIEW_FINANCIALS)
  @ApiOperation({
    summary: 'Estimate a route for every aircraft category',
    description:
      'Great-circle distance between the two airports, then per category: flight hours at its average speed, billed hours (never below its minimum), and estimated operator cost from its hourly rate — doubled for a round trip. A category without a rate returns `estimate: null`, never $0. `fitsParty` compares the passengers to the category\'s typical seats. Winds, routing and positioning are not modelled. Nothing is saved.',
  })
  estimate(@Body() body: EstimateDto) {
    return this.rates.estimate(body);
  }

  @Put(':category')
  @RequireWritePermissions(Permission.VIEW_FINANCIALS)
  @ApiOperation({
    summary: "Set one category's rates",
    description:
      'Creates the row the first time, updates it after. Every field optional; `null` clears one. Only a caller holding VIEW_FINANCIALS at ALL scope — an administrator or senior broker — may change a company-wide rate; a broker gets 403. Every change is audited with its before and after.',
  })
  set(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: CharterRateParamDto,
    @Body() body: SetCharterRateDto,
  ) {
    return this.rates.set(user, params.category, body);
  }
}
