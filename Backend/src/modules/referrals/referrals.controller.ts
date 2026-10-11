import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequireAccess } from '../../common/decorators/access.decorator.js';
import { AccessGuard } from '../../common/guards/access.guard.js';
import { Action, Module } from '../../common/authorization/access.js';
import type { AuthenticatedUser } from '../../common/types/api.types.js';
import { BulkIdsDto } from '../../common/dto/bulk.dto.js';
import { contentDisposition } from '../uploads/uploads.rules.js';
import { ReferralsService } from './referrals.service.js';
import { ReferralResourcesService } from './referral-resources.service.js';
import {
  ConvertReferralDto,
  CreateResourceDto,
  QueryReferralsDto,
  QueryResourcesDto,
  SubmitReferralDto,
  UpdateReferralDto,
  UpdateResourceDto,
} from './dto/referral.dto.js';

/**
 * Portal referrals — client adjustment #11.
 *
 * Reads are open to any authenticated session; reach scopes the rows:
 * - Referral agent: their own referrals only
 * - Broker: referrals assigned to them or unassigned
 * - Admin: ALL referrals
 *
 * Writes are gated by per-person permissions:
 * - CREATE: submit a referral (both partners and staff)
 * - EDIT: work or convert a referral (desk staff only)
 * - ARCHIVE: archive, bulk-archive or restore
 */
@ApiTags('Referrals')
@Controller('referrals')
@UseGuards(AccessGuard)
export class ReferralsController {
  constructor(private readonly referrals: ReferralsService) {}

  @Get()
  @ApiOperation({
    summary: 'List referrals',
    description:
      "A referral agent receives their own referrals, projected to what they submitted plus its status and booked trip — never the broker, the CRM client or anything internal — and `archived` is ignored for them. Search matches \"RF-1001\" and the client's name, email or phone.",
  })
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryReferralsDto) {
    return this.referrals.findAll(user, query);
  }

  /** Before `:id` — Nest matches in order. */
  @Get('stats')
  @ApiOperation({
    summary: 'Referral counts',
    description:
      "Total, submitted, active, booked (BOOKED + COMPLETED), completed and lost/cancelled — over the caller's own scope, so the same call is a referral agent's dashboard.",
  })
  stats(@CurrentUser() user: AuthenticatedUser) {
    return this.referrals.stats(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one referral', description: "Outside the caller's scope: 404, never 403." })
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.referrals.findOne(user, id);
  }

  @Get(':id/attachments/:uploadId')
  @Header('X-Content-Type-Options', 'nosniff')
  @ApiOperation({
    summary: "Open a referral's attachment",
    description:
      "Attachments are the agent's private uploads; whoever may read the referral may open them here. 404 unless the file is one of this referral's attachments.",
  })
  @ApiResponse({ status: 200, description: 'The file.' })
  async attachment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('uploadId', ParseUUIDPipe) uploadId: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const file = await this.referrals.openAttachment(user, id, uploadId);
    response.setHeader('Content-Type', file.contentType);
    response.setHeader('Content-Length', String(file.size));
    response.setHeader('Content-Disposition', contentDisposition(file));
    return new StreamableFile(file.stream);
  }

  @Post()
  @RequireAccess(Module.REFERRALS, Action.CREATE)
  @ApiOperation({
    summary: 'Submit a referral',
    description:
      'A referral agent submits as themselves; desk staff logging one must name `agentId`. A phone or an email is required. Attachments must be files the caller uploaded.',
  })
  submit(@CurrentUser() user: AuthenticatedUser, @Body() body: SubmitReferralDto) {
    return this.referrals.submit(user, body);
  }

  @Post('bulk-delete')
  @HttpCode(HttpStatus.OK)
  @RequireAccess(Module.REFERRALS, Action.ARCHIVE)
  @ApiOperation({ summary: 'Archive several referrals', description: 'Administrators and senior brokers only.' })
  removeMany(@CurrentUser() user: AuthenticatedUser, @Body() body: BulkIdsDto) {
    return this.referrals.removeMany(user, body.ids);
  }

  @Post('bulk-restore')
  @HttpCode(HttpStatus.OK)
  @RequireAccess(Module.REFERRALS, Action.ARCHIVE)
  @ApiOperation({ summary: 'Restore several archived referrals', description: 'Administrators and senior brokers only.' })
  restoreMany(@CurrentUser() user: AuthenticatedUser, @Body() body: BulkIdsDto) {
    return this.referrals.restoreMany(user, body.ids);
  }

  @Patch(':id')
  @RequireAccess(Module.REFERRALS, Action.EDIT)
  @ApiOperation({
    summary: 'Work a referral',
    description:
      "Status, assigned broker and the trip it booked. Desk only — a referral agent gets 403. Linking a trip requires the referral to be converted first, moves it to BOOKED, and raises the agent's commission from their standing structure.",
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateReferralDto,
  ) {
    return this.referrals.update(user, id, body);
  }

  @Post(':id/convert')
  @HttpCode(HttpStatus.OK)
  @RequireAccess(Module.REFERRALS, Action.EDIT)
  @ApiOperation({
    summary: 'Convert a referral into a client and a trip request',
    description:
      'Creates (or, with `clientId`, links) the CRM client — lead source REFERRAL — and an open trip request with the route, dates, party, preference and budget. Moves a SUBMITTED referral to CONTACTED. A second conversion is a 409. Desk only.',
  })
  convert(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ConvertReferralDto,
  ) {
    return this.referrals.convert(user, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireAccess(Module.REFERRALS, Action.ARCHIVE)
  @ApiOperation({ summary: 'Archive a referral', description: 'Administrators and senior brokers only. Nothing is deleted.' })
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.referrals.remove(user, id);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @RequireAccess(Module.REFERRALS, Action.ARCHIVE)
  @ApiOperation({ summary: 'Restore an archived referral', description: 'Clears the archive stamp and nothing else.' })
  restore(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.referrals.restore(user, id);
  }
}

/**
 * The portal's Resources section (#11). Open read for all signed-in sessions;
 * curating needs REFERRALS · CREATE/EDIT/ARCHIVE at ALL reach.
 */
@ApiTags('Referral Resources')
@Controller('referral-resources')
@UseGuards(AccessGuard)
export class ReferralResourcesController {
  constructor(private readonly resources: ReferralResourcesService) {}

  @Get()
  @ApiOperation({
    summary: 'List portal resources',
    description: 'Each carries the URL of a PUBLIC upload. `archived` is ignored for a referral agent.',
  })
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryResourcesDto) {
    return this.resources.findAll(user, query);
  }

  @Post()
  @RequireAccess(Module.REFERRALS, Action.CREATE)
  @ApiOperation({
    summary: 'Publish a resource to the portal',
    description: 'Administrators and senior brokers. `fileUrl` must be a PUBLIC upload, or agents could not open it.',
  })
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateResourceDto) {
    return this.resources.create(user, body);
  }

  @Patch(':id')
  @RequireAccess(Module.REFERRALS, Action.EDIT)
  @ApiOperation({ summary: 'Edit a portal resource' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateResourceDto,
  ) {
    return this.resources.update(user, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireAccess(Module.REFERRALS, Action.ARCHIVE)
  @ApiOperation({ summary: 'Take a resource off the portal', description: 'Archived, never deleted.' })
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.resources.remove(user, id);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @RequireAccess(Module.REFERRALS, Action.ARCHIVE)
  @ApiOperation({ summary: 'Put an archived resource back on the portal' })
  restore(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.resources.restore(user, id);
  }
}
