import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import {
  RequireAccess,
  StaffOnly,
} from '../../common/decorators/access.decorator.js';
import { Action, Module } from '../../common/authorization/access.js';
import { BulkIdsDto } from '../../common/dto/bulk.dto.js';
import type { AuthenticatedUser } from '../../common/types/api.types.js';
import { ClientsService } from './clients.service.js';
import {
  CreateClientDto,
  QueryClientsDto,
  UpdateClientDto,
} from './dto/client.dto.js';

/**
 * **Reads need only a staff session; every write needs the caller's own
 * Clients permission** (AGENTS.md, "Reads are open to every signed-in user") —
 * trip requests, quotes, trips, receivables and documents all pick a client.
 * Reach (ASSIGNED / ALL) filters the rows.
 *
 * `@StaffOnly`: a referral agent never manages or picks CRM clients directly
 * (their referrals are converted by staff, and CRM desk data is withheld).
 */
@ApiTags('Clients')
@StaffOnly()
@Controller('clients')
export class ClientsController {
  constructor(private readonly clients: ClientsService) {}

  @Get()
  @ApiOperation({
    summary: 'List clients and travel agents',
    description:
      'Open to any signed-in staff member. Scoped by reach: brokers receive only clients assigned to them.',
  })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryClientsDto,
  ) {
    return this.clients.findAll(user, query);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Client tiles',
    description:
      "Totals for the cards above the table, scoped exactly like the list — a broker's tiles count their own book, never the company's.",
  })
  stats(@CurrentUser() user: AuthenticatedUser) {
    return this.clients.stats(user);
  }

  /**
   * Before `:id`, like `stats` — Nest matches routes in order.
   *
   * Lives on clients rather than users because every number on it is lead
   * data. The roster is a view over Users; the performance is the client
   * module's to compute.
   */
  @Get('broker-performance')
  @ApiOperation({
    summary: 'The Agents roster — brokers with their lead numbers',
    description:
      '"Agents" here means the desk\'s own brokers. Travel agents are clients of type TRAVEL_AGENT and live in the client directory.\n\nScoped like the client list, so a broker\'s view of the roster counts their own book. `conversionRate` and `capacityUsed` are **null** rather than 0 when there is nothing to measure — a new broker showing "0% conversion" is a wrong answer that follows them around. `activeTrips` is null until the Trips module exists.\n\nThere is no create form: staff are invited through Users & Roles, where the permission matrix and the suspend rules live.',
  })
  brokerPerformance(@CurrentUser() user: AuthenticatedUser) {
    return this.clients.brokerPerformance(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one client' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.clients.findOne(user, id);
  }

  @Post()
  @RequireAccess(Module.CLIENTS, Action.CREATE)
  @ApiOperation({ summary: 'Create a client or travel agent' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateClientDto,
  ) {
    return this.clients.create(user, dto);
  }

  @Patch(':id')
  @RequireAccess(Module.CLIENTS, Action.EDIT)
  @ApiOperation({ summary: 'Update a client' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClientDto,
  ) {
    return this.clients.update(user, id, dto);
  }

  /**
   * Declared before `:id`, and POST rather than DELETE-with-body: proxies drop
   * bodies on DELETE, and a dropped body removes nothing while answering 200.
   */
  @Post('bulk-delete')
  @RequireAccess(Module.CLIENTS, Action.ARCHIVE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove several clients at once (soft)',
    description:
      "For the table's checkbox column. Scoped: a broker can only clear rows from their own book. Ids that match nothing are reported as `skipped` rather than failing the batch.",
  })
  removeMany(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: BulkIdsDto,
  ) {
    return this.clients.removeMany(user, dto.ids);
  }

  @Post('bulk-restore')
  @RequireAccess(Module.CLIENTS, Action.ARCHIVE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Restore several archived clients at once',
    description:
      "For the Archived tab's checkbox column. Ids that are not archived come back in `skipped`.",
  })
  restoreMany(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: BulkIdsDto,
  ) {
    return this.clients.restoreMany(user, dto.ids);
  }

  /**
   * 200, not the 201 that Nest gives a POST by default: a restore
   * creates nothing. It clears a deletion stamp on a row that has
   * existed all along, and every other module's restore says the same.
   */
  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @RequireAccess(Module.CLIENTS, Action.ARCHIVE)
  @ApiOperation({
    summary: 'Restore an archived client',
    description:
      'Clears the deletion stamp and nothing else, so every field comes back untouched. A row that is not archived returns 404.\n\nScoped like every other client read: a broker may restore only a client that was theirs.',
  })
  restore(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.clients.restore(user, id);
  }

  @Delete(':id')
  @RequireAccess(Module.CLIENTS, Action.ARCHIVE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Soft-delete a client',
    description: 'The record is retained; historical data is never destroyed.',
  })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.clients.remove(user, id);
  }
}

