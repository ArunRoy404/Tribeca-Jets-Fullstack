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
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequireAccess } from '../../common/decorators/access.decorator.js';
import { AccessGuard } from '../../common/guards/access.guard.js';
import { Action, Module } from '../../common/authorization/access.js';
import type { AuthenticatedUser } from '../../common/types/api.types.js';
import { BulkIdsDto } from '../../common/dto/bulk.dto.js';
import { CommissionsService } from './commissions.service.js';
import {
  CreateCommissionDto,
  QueryCommissionsDto,
  UpdateCommissionDto,
} from './dto/commission.dto.js';

/**
 * Commissions (scope §6.12) and #11's Commission Center.
 *
 * Reads are open to any signed-in session; reach scopes the rows:
 * - Admin: ALL
 * - Broker: commissions on their booked trips
 * - Referral Agent: their own commissions (partner view)
 *
 * Writes are gated by per-person permissions:
 * - CREATE: raise or edit commissions
 * - PAY: mark paid / update payment
 * - ARCHIVE: archive or restore
 */
@ApiTags('Commissions')
@Controller('commissions')
@UseGuards(AccessGuard)
export class CommissionsController {
  constructor(private readonly commissions: CommissionsService) {}

  @Get()
  @ApiOperation({
    summary: 'List commissions',
    description:
      '`estimatedAmount` is computed on every read — a percentage of the trip\'s computed profit, or the flat/custom amount — and is null while the trip\'s profit is unknown. `value` is `finalAmount` once settled, the estimate until then. A referral agent receives their own commissions only, without notes, broker or anything the desk keeps; `archived` is ignored for them.',
  })
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryCommissionsDto) {
    return this.commissions.findAll(user, query);
  }

  /** Before `:id` — Nest matches in order. */
  @Get('stats')
  @ApiOperation({
    summary: 'Commission totals',
    description:
      'Pending, earned and paid sums, the total and the average, over the caller\'s own scope — the Commissions tiles, and a referral agent\'s dashboard. `unvalued` counts commissions whose value cannot be known yet; they are in no sum and not in the average.',
  })
  stats(@CurrentUser() user: AuthenticatedUser) {
    return this.commissions.stats(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one commission', description: 'Outside the caller\'s scope: 404, never 403.' })
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.commissions.findOne(user, id);
  }

  @Post()
  @RequireAccess(Module.COMMISSIONS, Action.CREATE)
  @ApiOperation({
    summary: 'Raise a commission',
    description:
      'On a live trip. `recipientType` decides which recipient field is required. Leave `basis` out for a referral agent to copy their standing structure. PERCENT_OF_PROFIT takes `percentage`; FLAT_FEE and CUSTOM take `amount`. A PAID commission with no `paidAt` is dated today.',
  })
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateCommissionDto) {
    return this.commissions.create(user, body);
  }

  @Post('bulk-delete')
  @HttpCode(HttpStatus.OK)
  @RequireAccess(Module.COMMISSIONS, Action.ARCHIVE)
  @ApiOperation({ summary: 'Archive several commissions', description: 'Ids that match nothing come back in `skipped`.' })
  removeMany(@CurrentUser() user: AuthenticatedUser, @Body() body: BulkIdsDto) {
    return this.commissions.removeMany(user, body.ids);
  }

  @Post('bulk-restore')
  @HttpCode(HttpStatus.OK)
  @RequireAccess(Module.COMMISSIONS, Action.ARCHIVE)
  @ApiOperation({ summary: 'Restore several archived commissions' })
  restoreMany(@CurrentUser() user: AuthenticatedUser, @Body() body: BulkIdsDto) {
    return this.commissions.restoreMany(user, body.ids);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Edit a commission, settle it or mark it paid',
    description:
      'A basis change clears the figure the new basis does not use. Moving away from PAID clears `paidAt`; moving to PAID without one dates it today.',
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateCommissionDto,
  ) {
    return this.commissions.update(user, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireAccess(Module.COMMISSIONS, Action.ARCHIVE)
  @ApiOperation({ summary: 'Archive a commission', description: 'Nothing is deleted; restore brings it back.' })
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.commissions.remove(user, id);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @RequireAccess(Module.COMMISSIONS, Action.ARCHIVE)
  @ApiOperation({ summary: 'Restore an archived commission', description: 'Clears the archive stamp and nothing else.' })
  restore(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.commissions.restore(user, id);
  }
}
