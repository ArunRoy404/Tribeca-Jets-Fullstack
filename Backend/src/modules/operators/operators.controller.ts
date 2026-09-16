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
import type { AuthenticatedUser } from '../../common/types/api.types.js';
import { BulkIdsDto } from '../../common/dto/bulk.dto.js';
import { OperatorsService } from './operators.service.js';
import {
  CreateOperatorDto,
  QueryOperatorsDto,
  UpdateOperatorDto,
} from './dto/operator.dto.js';

/**
 * Assistants hold MANAGE_OPERATORS at READ scope, so the GETs below are open
 * to them and every write is not — which is what `@RequireWritePermissions`
 * enforces and `@RequirePermissions` would not.
 */
@ApiTags('Operators')
@Controller('operators')
export class OperatorsController {
  constructor(private readonly operators: OperatorsService) {}

  @Get()
  @RequirePermissions(Permission.MANAGE_OPERATORS)
  @ApiOperation({
    summary: 'List charter operators',
    description:
      'Shared master data — the same rows for every signed-in caller. Paginated, searchable across name, home base and contacts.',
  })
  findAll(@Query() query: QueryOperatorsDto) {
    return this.operators.findAll(query);
  }

  /** Before `:id` — Nest matches in order and would otherwise read it as an id. */
  @Get('stats')
  @RequirePermissions(Permission.MANAGE_OPERATORS)
  @ApiOperation({ summary: 'Counts for the tiles above the operators table' })
  stats() {
    return this.operators.stats();
  }

  @Get(':id')
  @RequirePermissions(Permission.MANAGE_OPERATORS)
  @ApiOperation({
    summary: 'Get one operator',
    description:
      'Includes empty `fleet`, `tripHistory` and `payments` arrays: the detail page has tabs for all three, and the modules that fill them do not exist yet.',
  })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.operators.findOne(id);
  }

  @Post()
  @RequireWritePermissions(Permission.MANAGE_OPERATORS)
  @ApiOperation({ summary: 'Add an operator' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateOperatorDto,
  ) {
    return this.operators.create(user, dto);
  }

  @Patch(':id')
  @RequireWritePermissions(Permission.MANAGE_OPERATORS)
  @ApiOperation({ summary: 'Update an operator' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOperatorDto,
  ) {
    return this.operators.update(user, id, dto);
  }

  /**
   * Declared before `:id` for the same reason `stats` is: Nest matches routes
   * in order, and a literal segment registered after a parameterised one is
   * swallowed by it.
   *
   * POST rather than DELETE-with-body: request bodies on DELETE are poorly
   * supported by proxies and HTTP clients alike, and silently dropped bodies
   * would turn "remove these three" into "remove nothing" with a 200.
   */
  @Post('bulk-delete')
  @RequireWritePermissions(Permission.MANAGE_OPERATORS)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove several operators at once (soft)',
    description:
      'For the table\'s checkbox column. Ids that match nothing are reported as `skipped` rather than failing the batch, so two people clearing the same rows both succeed.',
  })
  removeMany(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: BulkIdsDto,
  ) {
    return this.operators.removeMany(user, dto.ids);
  }

  /**
   * Also declared before `:id`, and POST for the same reason as bulk-delete.
   */
  @Post('bulk-restore')
  @RequireWritePermissions(Permission.MANAGE_OPERATORS)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Restore several archived operators at once',
    description:
      "For the Archived tab's checkbox column. Ids that are not archived are reported as `skipped` rather than failing the batch, so two people restoring the same selection both succeed.",
  })
  restoreMany(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: BulkIdsDto,
  ) {
    return this.operators.restoreMany(user, dto.ids);
  }

  @Post(':id/restore')
  @RequireWritePermissions(Permission.MANAGE_OPERATORS)
  @ApiOperation({
    summary: 'Restore an archived operator',
    description:
      'Clears the deletion stamp and nothing else, so every field comes back untouched. Requires the same write permission as removing it. A row that is not archived returns 404.',
  })
  restore(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.operators.restore(user, id);
  }

  @Delete(':id')
  @RequireWritePermissions(Permission.MANAGE_OPERATORS)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove an operator (soft)',
    description:
      'The row is kept: trips, quotes and payments will reference it, and destroying it would orphan the history of every flight it operated.',
  })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.operators.remove(user, id);
  }
}
