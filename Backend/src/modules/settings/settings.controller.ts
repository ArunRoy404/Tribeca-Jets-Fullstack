import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiProduces, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { RateLimit } from '../../common/decorators/rate-limit.decorator.js';
import { RequireAccess } from '../../common/decorators/access.decorator.js';
import { Action, Module } from '../../common/authorization/access.js';
import { EXPORT_CONTENT_TYPES } from '../../common/export/tabular.js';
import type { AuthenticatedUser } from '../../common/types/api.types.js';
import { MAX_UPLOAD_BYTES, contentDisposition } from '../uploads/uploads.rules.js';
import type { IncomingFile } from '../uploads/uploads.service.js';
import { IMPORT_TYPES, SettingsExportDto, SettingsImportFieldsDto } from './dto/settings-data.dto.js';
import { UpdateSettingsDto } from './dto/settings.dto.js';
import { SettingsService } from './settings.service.js';

const IMPORT_BODY_SCHEMA = {
  type: 'object',
  required: ['file', 'type'],
  properties: {
    file: {
      type: 'string',
      format: 'binary',
      description: 'A CSV or XLSX file (maximum 25 MB). Legacy .xls files are refused.',
    },
    type: {
      type: 'string',
      enum: [...IMPORT_TYPES],
      description: 'Which CRM directory the file imports into.',
    },
    mapping: {
      type: 'string',
      description: 'Optional JSON object mapping source header names to target fields (or "__skip").',
    },
  },
};

function requireImportFile(file: IncomingFile | undefined): IncomingFile {
  if (!file) {
    throw new BadRequestException('No file was received. Send it as multipart/form-data in a part named "file".');
  }
  return file;
}

/**
 * The company's settings (#26) — one set, for the whole company.
 *
 * Two of these routes are **public by design**: the branding — name, logo,
 * and contact details when shown — is on the sign-in page and every sidebar,
 * before and outside any session. They return only what the company shows
 * the world (`brandingView`), and the logo route serves only the one file the
 * settings name.
 */
@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  @RequireAccess(Module.SETTINGS, Action.VIEW)
  @ApiOperation({
    summary: "The company's settings",
    description:
      'One object per Settings screen — company, defaults, security, notifications — in the shape PATCH accepts.',
  })
  view() {
    return this.settings.view();
  }

  @Patch()
  @RequireAccess(Module.SETTINGS, Action.EDIT)
  @ApiOperation({
    summary: 'Change settings',
    description:
      'Send one or more sections; within a section, only the fields to change. Absent fields are left alone, ' +
      'an empty text field clears it. A default seeds the next record and never rewrites an existing one. ' +
      'Audited as settings.updated with every value that moved.',
  })
  update(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateSettingsDto) {
    return this.settings.update(user, dto);
  }

  @Get('export')
  @RequireAccess(Module.SETTINGS, Action.VIEW)
  @Header('X-Content-Type-Options', 'nosniff')
  @ApiProduces(EXPORT_CONTENT_TYPES.CSV, EXPORT_CONTENT_TYPES.XLSX)
  @ApiOperation({
    summary: 'Export CRM data (#31)',
    description:
      'Downloads a CSV or XLSX file for the selected scope (`CLIENTS`, `TRIPS`, `QUOTES`, `RECEIVABLES`, ' +
      '`OPERATOR_PAYMENTS`, `COMMISSIONS`), or a multi-sheet XLSX workbook for `ALL`. Optionally filtered by ' +
      '`from` and `to` (YYYY-MM-DD) and `includeArchived=true`.',
  })
  async exportData(
    @Query() query: SettingsExportDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const file = await this.settings.exportData(query);
    response.setHeader('Content-Type', file.contentType);
    response.setHeader('Content-Length', String(file.body.length));
    response.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    return new StreamableFile(file.body);
  }

  @Post('import/validate')
  @HttpCode(HttpStatus.OK)
  @RequireAccess(Module.SETTINGS, Action.EDIT)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: IMPORT_BODY_SCHEMA })
  @ApiOperation({
    summary: 'Validate an import file (#31)',
    description:
      'Reads a CSV or XLSX file from its bytes, resolves column mappings, checks required fields and existing CRM ' +
      'duplicates, and returns a row-by-row preview (`VALID`, `DUPLICATE`, `ERROR`) without writing to the database.',
  })
  validateImport(
    @UploadedFile() file: IncomingFile | undefined,
    @Body() fields: SettingsImportFieldsDto,
  ) {
    return this.settings.validateImport(requireImportFile(file), fields);
  }

  @Post('import/commit')
  @HttpCode(HttpStatus.OK)
  @RequireAccess(Module.SETTINGS, Action.EDIT)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: IMPORT_BODY_SCHEMA })
  @ApiOperation({
    summary: 'Commit an import file (#31)',
    description:
      'Validates the uploaded CSV or XLSX file and inserts all valid, non-duplicate rows in a transaction. ' +
      'Duplicates and invalid rows are skipped and reported in the summary.',
  })
  commitImport(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: IncomingFile | undefined,
    @Body() fields: SettingsImportFieldsDto,
  ) {
    return this.settings.commitImport(user, requireImportFile(file), fields);
  }

  @Public()
  @RateLimit({ limit: 120, windowSeconds: 60 })
  @Get('branding')
  @ApiOperation({
    summary: 'Company branding (public)',
    description:
      'Name and logo always; email, website, phone and address only while "Show company contact block" is on; ' +
      'and the client-facing document toggles. Needs no session — the sign-in page reads it.',
  })
  branding() {
    return this.settings.branding();
  }

  @Public()
  @RateLimit({ limit: 120, windowSeconds: 60 })
  @Get('branding/logo')
  @Header('X-Content-Type-Options', 'nosniff')
  // The URL carries ?v=<upload id>, so a new logo is a new address and this
  // one may be cached; an hour bounds a logo that was removed.
  @Header('Cache-Control', 'public, max-age=3600')
  @ApiOperation({
    summary: 'Company logo (public)',
    description: 'The logo image itself, with no session. 404 when no logo is set.',
  })
  @ApiResponse({ status: 200, description: 'The logo image.' })
  async logo(@Res({ passthrough: true }) response: Response): Promise<StreamableFile> {
    const file = await this.settings.openLogo();
    response.setHeader('Content-Type', file.contentType);
    response.setHeader('Content-Length', String(file.size));
    response.setHeader('Content-Disposition', contentDisposition(file));
    return new StreamableFile(file.stream);
  }
}
