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
import { EmailTemplatesService } from './email-templates.service.js';
import { MERGE_FIELDS } from './email.fields.js';
import {
  CreateEmailTemplateDto,
  EmailTemplateStatsDto,
  QueryEmailTemplatesDto,
  UpdateEmailTemplateDto,
} from './dto/email-template.dto.js';

/**
 * Email Templates (#21) — the library. MANAGE_EMAIL_TEMPLATES at READ is
 * enough to read and use it (every staff role); changing it needs ALL
 * (administrators and senior brokers).
 */
@ApiTags('Email Templates')
@Controller('email-templates')
export class EmailTemplatesController {
  constructor(private readonly templates: EmailTemplatesService) {}

  @Get()
  @RequirePermissions(Permission.MANAGE_EMAIL_TEMPLATES)
  @ApiOperation({
    summary: 'List templates',
    description: '`category` and `active` filter; `search` matches the name, subject and body. `archived=true` lists the archived half.',
  })
  findAll(@Query() query: QueryEmailTemplatesDto) {
    return this.templates.findAll(query);
  }

  @Get('stats')
  @RequirePermissions(Permission.MANAGE_EMAIL_TEMPLATES)
  @ApiOperation({
    summary: 'The tiles above the library',
    description:
      'Live templates, how many are active, how many categories the library actually uses, and how many emails a mail server accepted this month (`on` picks the month) — among the emails you may see.',
  })
  stats(@CurrentUser() user: AuthenticatedUser, @Query() query: EmailTemplateStatsDto) {
    return this.templates.stats(user, query);
  }

  @Get('fields')
  @RequirePermissions(Permission.MANAGE_EMAIL_TEMPLATES)
  @ApiOperation({
    summary: 'The merge fields a template may use',
    description:
      'The one catalogue the editor, the save check and the send-time fill all read. `source` says which record fills it: client, operator, trip, quote, invoice or sender.',
  })
  fields() {
    return MERGE_FIELDS;
  }

  @Get(':id')
  @RequirePermissions(Permission.MANAGE_EMAIL_TEMPLATES)
  @ApiOperation({ summary: 'One template', description: 'Archived templates load too.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.templates.findOne(id);
  }

  @Post()
  @RequireWritePermissions(Permission.MANAGE_EMAIL_TEMPLATES)
  @ApiOperation({
    summary: 'Add a template',
    description: 'A merge field that is not in the catalogue is refused with a 400 naming it.',
  })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateEmailTemplateDto) {
    return this.templates.create(user, dto);
  }

  @Post('bulk-delete')
  @HttpCode(HttpStatus.OK)
  @RequireWritePermissions(Permission.MANAGE_EMAIL_TEMPLATES)
  @ApiOperation({ summary: 'Archive several templates', description: 'Ids that match nothing come back in `skipped`.' })
  removeMany(@CurrentUser() user: AuthenticatedUser, @Body() body: BulkIdsDto) {
    return this.templates.removeMany(user, body.ids);
  }

  @Post('bulk-restore')
  @HttpCode(HttpStatus.OK)
  @RequireWritePermissions(Permission.MANAGE_EMAIL_TEMPLATES)
  @ApiOperation({ summary: 'Restore several archived templates' })
  restoreMany(@CurrentUser() user: AuthenticatedUser, @Body() body: BulkIdsDto) {
    return this.templates.restoreMany(user, body.ids);
  }

  @Patch(':id')
  @RequireWritePermissions(Permission.MANAGE_EMAIL_TEMPLATES)
  @ApiOperation({
    summary: 'Edit a template, or switch it on or off',
    description: 'Only the fields sent change. Emails already sent from it are snapshots and do not change.',
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmailTemplateDto,
  ) {
    return this.templates.update(user, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireWritePermissions(Permission.MANAGE_EMAIL_TEMPLATES)
  @ApiOperation({ summary: 'Archive a template', description: 'Nothing is deleted — restore brings it back.' })
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.templates.remove(user, id);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @RequireWritePermissions(Permission.MANAGE_EMAIL_TEMPLATES)
  @ApiOperation({ summary: 'Restore an archived template' })
  restore(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.templates.restore(user, id);
  }
}
