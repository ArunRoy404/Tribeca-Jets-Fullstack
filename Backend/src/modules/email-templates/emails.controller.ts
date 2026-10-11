import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { AccessGuard } from '../../common/guards/access.guard.js';
import { RequireAccess, StaffOnly } from '../../common/decorators/access.decorator.js';
import { Action, Module } from '../../common/authorization/access.catalogue.js';
import type { AuthenticatedUser } from '../../common/types/api.types.js';
import { EmailsService } from './emails.service.js';
import { PreviewEmailDto, QueryEmailsDto, SendEmailDto } from './dto/email.dto.js';

/**
 * Emailing a client or an operator, and the log of what was sent (#21).
 * Open reads for staff (scoped by administrator vs own/assigned).
 * Preview requires a session (open for staff).
 * Sending an email requires EMAIL_TEMPLATES · SEND.
 * Each record an email names is also checked against its own read permission.
 */
@ApiTags('Emails')
@UseGuards(AccessGuard)
@StaffOnly()
@Controller('emails')
export class EmailsController {
  constructor(private readonly emails: EmailsService) {}

  @Get()
  @ApiOperation({
    summary: 'The sent log',
    description:
      'Newest first. Every email the CRM sent — or tried to: `status` is SENT (a mail server accepted it), LOGGED (no mail server configured, delivered to nobody) or FAILED (refused). Filter by client, operator, trip or template; `search` matches the subject and the recipient.',
  })
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryEmailsDto) {
    return this.emails.findAll(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'One sent email', description: 'Exactly as it went out, merge fields filled.' })
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.emails.findOne(user, id);
  }

  @Post('preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Fill a template for a recipient',
    description:
      'Sends nothing and writes nothing. Returns the recipient’s address (null when none is on file), the subject and body with every merge field that could be filled, and `missing` — the fields whose record was not given or whose fact is not on file, left as their tokens.',
  })
  preview(@CurrentUser() user: AuthenticatedUser, @Body() dto: PreviewEmailDto) {
    return this.emails.preview(user, dto);
  }

  @Post()
  @RequireAccess(Module.EMAIL_TEMPLATES, Action.SEND)
  @ApiOperation({
    summary: 'Send an email',
    description:
      'To a client or an operator, from the desk’s mail server with your address as Reply-To. Merge fields left in the text are filled again; a missing one is a 400 naming it. The email is recorded as sent, and appears on the client’s and the trip’s timelines. Without a mail server configured it is recorded as LOGGED — delivered to nobody.',
  })
  @ApiResponse({
    status: 502,
    description: 'The mail server refused it. Nothing was delivered; the attempt is recorded as FAILED in the sent log.',
  })
  send(@CurrentUser() user: AuthenticatedUser, @Body() dto: SendEmailDto) {
    return this.emails.send(user, dto);
  }
}
