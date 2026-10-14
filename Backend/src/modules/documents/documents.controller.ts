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
import { AccessGuard } from '../../common/guards/access.guard.js';
import { RequireAccess, StaffOnly } from '../../common/decorators/access.decorator.js';
import { Action, Module } from '../../common/authorization/access.js';
import type { AuthenticatedUser } from '../../common/types/api.types.js';
import { BulkIdsDto } from '../../common/dto/bulk.dto.js';
import { contentDisposition } from '../uploads/uploads.rules.js';
import { DocumentsService } from './documents.service.js';
import {
  CreateDocumentDto,
  DocumentStatsDto,
  QueryDocumentsDto,
  UpdateDocumentDto,
} from './dto/document.dto.js';

/**
 * Document Vault (#22 / #28). Open staff reads (the folders and stats feed
 * pickers and detail tabs across modules). Writes guarded by per-person access:
 * CREATE (file), EDIT, ARCHIVE. Passports and IDs restricted to VIEW_SENSITIVE.
 */
@ApiTags('Documents')
@Controller('documents')
@UseGuards(AccessGuard)
@StaffOnly()
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get()
  @ApiOperation({
    summary: 'List documents',
    description:
      'The vault, or one folder with `clientId` / `tripId` / `operatorId`. `owner` narrows to one kind of folder, `category` to one kind of document, `expiry` to NONE, VALID, EXPIRING (within 90 days of `on`) or EXPIRED. `search` matches the title, notes, file name, the owner and a trip\'s TJ-number. `archived=true` lists the archived half. Passports and IDs are absent for a role without VIEW_SENSITIVE.',
  })
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryDocumentsDto) {
    return this.documents.findAll(user, query);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'The tiles',
    description: 'Live documents in your scope — optionally one folder — by kind of folder, expired, and expiring within 90 days of `on`.',
  })
  stats(@CurrentUser() user: AuthenticatedUser, @Query() query: DocumentStatsDto) {
    return this.documents.stats(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'One document', description: 'Archived documents load too — the Archived tab opens them.' })
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.documents.findOne(user, id);
  }

  @Get(':id/file')
  @Header('X-Content-Type-Options', 'nosniff')
  @ApiOperation({
    summary: "Open a document's file",
    description:
      "The bytes, for whoever may read the document — the file is usually someone else's private upload, so it opens through the document rather than /uploads/:id. Images open inline; everything else downloads.",
  })
  @ApiResponse({ status: 200, description: 'The file.' })
  async file(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const file = await this.documents.openFile(user, id);
    response.setHeader('Content-Type', file.contentType);
    response.setHeader('Content-Length', String(file.size));
    response.setHeader('Content-Disposition', contentDisposition(file));
    return new StreamableFile(file.stream);
  }

  @Post()
  @RequireAccess(Module.DOCUMENTS, Action.CREATE)
  @ApiOperation({
    summary: 'File a document',
    description:
      'Upload the file first (POST /uploads/document or /uploads/image) and send its URL as `fileUrl`, with exactly one of `clientId`, `tripId` or `operatorId`. The file must be one you may read; the folder must be one you may see and not archived. Filing a PASSPORT or ID needs VIEW_SENSITIVE.',
  })
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateDocumentDto) {
    return this.documents.create(user, body);
  }

  @Post('bulk-delete')
  @HttpCode(HttpStatus.OK)
  @RequireAccess(Module.DOCUMENTS, Action.ARCHIVE)
  @ApiOperation({
    summary: 'Archive several documents',
    description: 'Ids out of scope, already archived, or filed by someone else (for a broker) come back in `skipped`.',
  })
  removeMany(@CurrentUser() user: AuthenticatedUser, @Body() body: BulkIdsDto) {
    return this.documents.removeMany(user, body.ids);
  }

  @Post('bulk-restore')
  @HttpCode(HttpStatus.OK)
  @RequireAccess(Module.DOCUMENTS, Action.ARCHIVE)
  @ApiOperation({ summary: 'Restore several documents', description: 'The same partial-success rule as archiving.' })
  restoreMany(@CurrentUser() user: AuthenticatedUser, @Body() body: BulkIdsDto) {
    return this.documents.restoreMany(user, body.ids);
  }

  @Patch(':id')
  @RequireAccess(Module.DOCUMENTS, Action.EDIT)
  @ApiOperation({
    summary: 'Edit a document',
    description: 'Title, category, expiry, notes, or a new `fileUrl` to replace the file. The folder cannot change — archive it and file it again.',
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateDocumentDto,
  ) {
    return this.documents.update(user, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireAccess(Module.DOCUMENTS, Action.ARCHIVE)
  @ApiOperation({
    summary: 'Archive a document',
    description: 'Nothing is deleted, and the file stays in storage. Whoever filed it, or an administrator.',
  })
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.documents.remove(user, id);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @RequireAccess(Module.DOCUMENTS, Action.ARCHIVE)
  @ApiOperation({ summary: 'Restore an archived document' })
  restore(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.documents.restore(user, id);
  }
}
