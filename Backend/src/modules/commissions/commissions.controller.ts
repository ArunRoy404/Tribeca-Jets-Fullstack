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
import { CommissionsService } from './commissions.service.js';
import {
  CreateCommissionDto,
  QueryCommissionsDto,
  UpdateCommissionDto,
} from './dto/commission.dto.js';

/**
 * Commissions (scope §6.12) and #11's Commission Center.
 *
 * VIEW_COMMISSIONS reads — every row for an administrator or senior broker,
 * the rows booked against them for a broker, the rows paid to them for a
 * referral agent. MANAGE_COMMISSIONS writes, and only roles that see every
 * row hold it.
 */
@ApiTags('Commissions')
@Controller('commissions')
export class CommissionsController {
  constructor(private readonly commissions: CommissionsService) {}

  @Get()
  @RequirePermissions(Permission.VIEW_COMMISSIONS)
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
  @RequirePermissions(Permission.VIEW_COMMISSIONS)
  @ApiOperation({
    summary: 'Commission totals',
    description:
      'Pending, earned and paid sums, the total and the average, over the caller\'s own scope — the Commissions tiles, and a referral agent\'s dashboard. `unvalued` counts commissions whose value cannot be known yet; they are in no sum and not in the average.',
  })
  stats(@CurrentUser() user: AuthenticatedUser) {
    return this.commissions.stats(user);
  }

  @Get(':id')
  @RequirePermissions(Permission.VIEW_COMMISSIONS)
  @ApiOperation({ summary: 'Get one commission', description: 'Outside the caller\'s scope: 404, never 403.' })
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.commissions.findOne(user, id);
  }

  @Post()
  @RequireWritePermissions(Permission.MANAGE_COMMISSIONS)
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
  @RequireWritePermissions(Permission.MANAGE_COMMISSIONS)
  @ApiOperation({ summary: 'Archive several commissions', description: 'Ids that match nothing come back in `skipped`.' })
  removeMany(@CurrentUser() user: AuthenticatedUser, @Body() body: BulkIdsDto) {
    return this.commissions.removeMany(user, body.ids);
  }

  @Post('bulk-restore')
  @HttpCode(HttpStatus.OK)
  @RequireWritePermissions(Permission.MANAGE_COMMISSIONS)
  @ApiOperation({ summary: 'Restore several archived commissions' })
  restoreMany(@CurrentUser() user: AuthenticatedUser, @Body() body: BulkIdsDto) {
    return this.commissions.restoreMany(user, body.ids);
  }

  @Patch(':id')
  @RequireWritePermissions(Permission.MANAGE_COMMISSIONS)
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
  @RequireWritePermissions(Permission.MANAGE_COMMISSIONS)
  @ApiOperation({ summary: 'Archive a commission', description: 'Nothing is deleted; restore brings it back.' })
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.commissions.remove(user, id);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @RequireWritePermissions(Permission.MANAGE_COMMISSIONS)
  @ApiOperation({ summary: 'Restore an archived commission', description: 'Clears the archive stamp and nothing else.' })
  restore(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.commissions.restore(user, id);
  }
}
