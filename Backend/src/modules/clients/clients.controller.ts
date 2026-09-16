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
  RequirePermissions,
  RequireWritePermissions,
} from '../../common/decorators/permissions.decorator.js';
import { Permission } from '../../common/authorization/permissions.js';
import { BulkIdsDto } from '../../common/dto/bulk.dto.js';
import type { AuthenticatedUser } from '../../common/types/api.types.js';
import { ClientsService } from './clients.service.js';
import {
  CreateClientDto,
  QueryClientsDto,
  UpdateClientDto,
} from './dto/client.dto.js';

@ApiTags('Clients')
@Controller('clients')
export class ClientsController {
  constructor(private readonly clients: ClientsService) {}

  @Get()
  @RequirePermissions(Permission.VIEW_CLIENTS)
  @ApiOperation({
    summary: 'List clients and travel agents',
    description: 'Brokers receive only the clients assigned to them.',
  })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryClientsDto,
  ) {
    return this.clients.findAll(user, query);
  }

  @Get('stats')
  @RequirePermissions(Permission.VIEW_CLIENTS)
  @ApiOperation({
    summary: 'Client tiles',
    description:
      "Totals for the cards above the table, scoped exactly like the list — a broker's tiles count their own book, never the company's.",
  })
  stats(@CurrentUser() user: AuthenticatedUser) {
    return this.clients.stats(user);
  }

  @Get(':id')
  @RequirePermissions(Permission.VIEW_CLIENTS)
  @ApiOperation({ summary: 'Get one client' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.clients.findOne(user, id);
  }

  @Post()
  @RequireWritePermissions(Permission.MANAGE_CLIENTS)
  @ApiOperation({ summary: 'Create a client or travel agent' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateClientDto,
  ) {
    return this.clients.create(user, dto);
  }

  @Patch(':id')
  @RequireWritePermissions(Permission.MANAGE_CLIENTS)
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
  @RequireWritePermissions(Permission.MANAGE_CLIENTS)
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
  @RequireWritePermissions(Permission.MANAGE_CLIENTS)
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

  @Post(':id/restore')
  @RequireWritePermissions(Permission.MANAGE_CLIENTS)
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
  @RequireWritePermissions(Permission.MANAGE_CLIENTS)
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
