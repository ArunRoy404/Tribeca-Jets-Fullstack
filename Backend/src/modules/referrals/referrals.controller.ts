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
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import {
  RequirePermissions,
  RequireWritePermissions,
} from '../../common/decorators/permissions.decorator.js';
import { Permission } from '../../common/authorization/permissions.js';
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
 * VIEW_REFERRALS reads (a referral agent: their own; a broker: assigned and
 * unassigned; the rest: all). MANAGE_REFERRALS writes — for a referral agent
 * that is submitting and nothing more, which the service enforces: every
 * later change is the desk's.
 */
@ApiTags('Referrals')
@Controller('referrals')
export class ReferralsController {
  constructor(private readonly referrals: ReferralsService) {}

  @Get()
  @RequirePermissions(Permission.VIEW_REFERRALS)
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
  @RequirePermissions(Permission.VIEW_REFERRALS)
  @ApiOperation({
    summary: 'Referral counts',
    description:
      "Total, submitted, active, booked (BOOKED + COMPLETED), completed and lost/cancelled — over the caller's own scope, so the same call is a referral agent's dashboard.",
  })
  stats(@CurrentUser() user: AuthenticatedUser) {
    return this.referrals.stats(user);
  }

  @Get(':id')
  @RequirePermissions(Permission.VIEW_REFERRALS)
  @ApiOperation({ summary: 'Get one referral', description: "Outside the caller's scope: 404, never 403." })
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.referrals.findOne(user, id);
  }

  @Get(':id/attachments/:uploadId')
  @RequirePermissions(Permission.VIEW_REFERRALS)
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
  @RequireWritePermissions(Permission.MANAGE_REFERRALS)
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
  @RequireWritePermissions(Permission.MANAGE_REFERRALS)
  @ApiOperation({ summary: 'Archive several referrals', description: 'Administrators and senior brokers only.' })
  removeMany(@CurrentUser() user: AuthenticatedUser, @Body() body: BulkIdsDto) {
    return this.referrals.removeMany(user, body.ids);
  }

  @Post('bulk-restore')
  @HttpCode(HttpStatus.OK)
  @RequireWritePermissions(Permission.MANAGE_REFERRALS)
  @ApiOperation({ summary: 'Restore several archived referrals', description: 'Administrators and senior brokers only.' })
  restoreMany(@CurrentUser() user: AuthenticatedUser, @Body() body: BulkIdsDto) {
    return this.referrals.restoreMany(user, body.ids);
  }

  @Patch(':id')
  @RequireWritePermissions(Permission.MANAGE_REFERRALS)
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
  @RequireWritePermissions(Permission.MANAGE_REFERRALS)
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
  @RequireWritePermissions(Permission.MANAGE_REFERRALS)
  @ApiOperation({ summary: 'Archive a referral', description: 'Administrators and senior brokers only. Nothing is deleted.' })
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.referrals.remove(user, id);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @RequireWritePermissions(Permission.MANAGE_REFERRALS)
  @ApiOperation({ summary: 'Restore an archived referral', description: 'Clears the archive stamp and nothing else.' })
  restore(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.referrals.restore(user, id);
  }
}

/**
 * The portal's Resources section (#11). Every VIEW_REFERRALS holder reads;
 * curating needs MANAGE_REFERRALS at ALL, checked in the service.
 */
@ApiTags('Referral Resources')
@Controller('referral-resources')
export class ReferralResourcesController {
  constructor(private readonly resources: ReferralResourcesService) {}

  @Get()
  @RequirePermissions(Permission.VIEW_REFERRALS)
  @ApiOperation({
    summary: 'List portal resources',
    description: 'Each carries the URL of a PUBLIC upload. `archived` is ignored for a referral agent.',
  })
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryResourcesDto) {
    return this.resources.findAll(user, query);
  }

  @Post()
  @RequireWritePermissions(Permission.MANAGE_REFERRALS)
  @ApiOperation({
    summary: 'Publish a resource to the portal',
    description: 'Administrators and senior brokers. `fileUrl` must be a PUBLIC upload, or agents could not open it.',
  })
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateResourceDto) {
    return this.resources.create(user, body);
  }

  @Patch(':id')
  @RequireWritePermissions(Permission.MANAGE_REFERRALS)
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
  @RequireWritePermissions(Permission.MANAGE_REFERRALS)
  @ApiOperation({ summary: 'Take a resource off the portal', description: 'Archived, never deleted.' })
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.resources.remove(user, id);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @RequireWritePermissions(Permission.MANAGE_REFERRALS)
  @ApiOperation({ summary: 'Put an archived resource back on the portal' })
  restore(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.resources.restore(user, id);
  }
}
