import {
  BadRequestException,
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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/types/api.types.js';
import { BulkIdsDto } from '../../common/dto/bulk.dto.js';
import { FilesService } from './files.service.js';
import { MAX_UPLOAD_BYTES } from './files.access.js';
import {
  QueryFilesDto,
  UpdateFileDto,
  UploadFileDto,
} from './dto/file.dto.js';

/**
 * Storage for every document the desk keeps: a broker's tax forms, the
 * company's published resources, photographs of a tail.
 *
 * **These routes carry no `@RequirePermissions`, and that is deliberate.**
 * Which permission governs a file is a property of its `category` — a 1099 and
 * a marketing brochure are both rows in this table and are not remotely the
 * same secret — so the check cannot be made before the row is read. It happens
 * in the service, against `FILE_CATEGORY_RULES`, which is also where the
 * row-level rule lives that lets a broker open their own personal folder
 * without being able to open anybody else's.
 *
 * Reads that fail answer 404 and writes that fail answer 403, for the usual
 * reason: a 403 on a read confirms the row exists, and for a personal document
 * that turns a list of user ids into a register of who has been paid.
 */
@ApiTags('Files')
@Controller('files')
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Get()
  @ApiOperation({
    summary: 'List files',
    description:
      'Returns only what the caller may see: every published RESOURCE, plus USER_DOCUMENT rows in their own folder, plus AIRCRAFT_PHOTO rows if their role can read the fleet. Paginated, searchable across filename and label, filterable by category, owner and aircraft. `?archived=true` serves the Archived tab.',
  })
  @ApiResponse({
    status: 403,
    description:
      'The `category` filter names a kind of file this role cannot read at all. An empty list would read as "there are no tax forms" rather than "these are not yours to see".',
  })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryFilesDto,
  ) {
    return this.files.findAll(user, query);
  }

  /** Before `:id` — Nest matches in order and would otherwise read it as an id. */
  @Get('stats')
  @ApiOperation({
    summary: 'Counts for the tiles above a file list',
    description:
      'Scoped to what the caller may see, so two roles legitimately get different totals.',
  })
  stats(@CurrentUser() user: AuthenticatedUser) {
    return this.files.stats(user);
  }

  /**
   * Also before `:id`. Serves a stored object by its storage key rather than
   * by a row id, which is how objects that are not rows in this table are
   * fetched — a user's avatar, whose key lives on `users.avatarKey`. The key
   * is URL-encoded, so its slashes arrive as `%2F`.
   *
   * A key that *is* a registered file goes through the full category rule, so
   * this is not a way around `GET /files/:id/download`.
   */
  @Get('objects/:key')
  @Header('X-Content-Type-Options', 'nosniff')
  @ApiOperation({
    summary: 'Serve a stored object by storage key',
    description:
      'For driver-managed objects such as avatars. Authenticated like every other route — the session cookie travels with an `<img>` request, so no presigned URL is needed and permission is re-checked on every fetch rather than frozen into a link.',
  })
  async serveObject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('key') key: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const object = await this.files.openStreamByKey(user, key);
    response.setHeader('Content-Type', object.contentType);
    response.setHeader(
      'Content-Disposition',
      contentDisposition(object.contentType, object.filename),
    );
    return new StreamableFile(object.stream);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get one file',
    description:
      'Metadata only — the bytes come from the download route below. Archived files are returned, with their archive trail, because the Archived tab links straight here. `storageKey` is never in the payload: it is the address of the bytes, and every permission check in this module assumes reaching them means going through a route that re-checks it.',
  })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.files.findOne(user, id);
  }

  @Get(':id/download')
  @Header('X-Content-Type-Options', 'nosniff')
  @ApiOperation({
    summary: 'Download a file',
    description:
      'Streams the stored bytes with the content type detected at upload, never one supplied by a caller. Images are served inline so they can be used in an `<img>`; everything else downloads. An archived file still downloads — the row is archived, the bytes are not, and refusing here would make the Archived tab a list of documents nobody can open.',
  })
  async download(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const file = await this.files.openStream(user, id);
    response.setHeader('Content-Type', file.contentType);
    response.setHeader('Content-Length', String(file.size));
    response.setHeader(
      'Content-Disposition',
      contentDisposition(file.contentType, file.filename),
    );
    return new StreamableFile(file.stream);
  }

  /**
   * `MAX_UPLOAD_BYTES` is the widest ceiling any category allows, and it is
   * the outer gate only: multer needs one number before it knows what it is
   * receiving. The real, narrower limit is applied in the service once
   * `category` has been parsed. Both are needed — without this one a
   * multi-gigabyte body is buffered before anybody checks it.
   */
  @Post()
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description:
      'Multipart. `file` carries the bytes; the remaining fields are the metadata below.',
    required: true,
    schema: {
      type: 'object',
      required: ['file', 'category'],
      properties: {
        file: { type: 'string', format: 'binary' },
        category: {
          type: 'string',
          enum: ['USER_DOCUMENT', 'RESOURCE', 'AIRCRAFT_PHOTO'],
        },
        ownerUserId: {
          type: 'string',
          format: 'uuid',
          description: 'Required for USER_DOCUMENT, rejected otherwise.',
        },
        aircraftId: {
          type: 'string',
          format: 'uuid',
          description: 'Required for AIRCRAFT_PHOTO, rejected otherwise.',
        },
        label: { type: 'string', maxLength: 200 },
        notes: { type: 'string', maxLength: 5000 },
      },
    },
  })
  @ApiOperation({
    summary: 'Upload a file',
    description:
      'The content type is read from the bytes, not from the upload header — a sender-chosen type would decide what the download route later hands a browser. Formats and size limits are per category: documents for a personal folder, images for an aircraft photo, either for a company resource. Refuses SVG, archives and legacy Office formats.',
  })
  @ApiResponse({
    status: 403,
    description:
      'This role cannot write files of that category. Which permission applies depends on `category`, so this cannot be a guard — see FILE_CATEGORY_RULES.',
  })
  @ApiResponse({
    status: 413,
    description:
      'Larger than the ceiling for that category: 25 MB for a personal document, 15 MB for an aircraft photo, 50 MB for a company resource.',
  })
  @ApiResponse({
    status: 415,
    description:
      'The bytes are not a format this category accepts. The response names what was expected — note this is judged on content, so renaming a file changes nothing.',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UploadFileDto,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    return this.files.create(user, dto, requireFile(file));
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Rename a file or edit its notes',
    description:
      'Only the label and notes. The bytes, the category and the owner are immutable: re-categorising a stored file would move it between access rules without anybody re-reading it. Replacing a document means uploading a new one and archiving the old, which is also the only version history this table keeps.',
  })
  @ApiResponse({ status: 403, description: 'This role cannot write files of that category.' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFileDto,
  ) {
    return this.files.update(user, id, dto);
  }

  /**
   * Declared before `:id` for the same reason `stats` is, and POST rather than
   * DELETE-with-body because proxies drop bodies on DELETE — a dropped body
   * would remove nothing while answering 200.
   */
  @Post('bulk-delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove several files at once (soft)',
    description:
      "Ids that match nothing, that the caller cannot see, or whose category they cannot write are reported as `skipped` rather than failing the batch — a mixed selection must not force a choice between revealing which rows exist and refusing the whole action.",
  })
  removeMany(@CurrentUser() user: AuthenticatedUser, @Body() dto: BulkIdsDto) {
    return this.files.removeMany(user, dto.ids);
  }

  @Post('bulk-restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Restore several archived files at once',
    description:
      'The mirror of bulk-delete, for the Archived tab’s checkbox column, with the same partial-success rule.',
  })
  restoreMany(@CurrentUser() user: AuthenticatedUser, @Body() dto: BulkIdsDto) {
    return this.files.restoreMany(user, dto.ids);
  }

  /**
   * 200, not the 201 Nest gives a POST by default: a restore creates nothing.
   */
  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Restore an archived file',
    description:
      'Clears the deletion stamp and nothing else. The bytes never left storage, which is exactly why this can promise to hand back the same file.',
  })
  @ApiResponse({ status: 403, description: 'This role cannot write files of that category.' })
  restore(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.files.restore(user, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove a file (soft)',
    description:
      'Archives the row and leaves the object in storage untouched. There is no permanent delete in this system, and a restore that could not return the same bytes would not be a restore.',
  })
  @ApiResponse({ status: 403, description: 'This role cannot write files of that category.' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.files.remove(user, id);
  }
}

/**
 * Whether the browser should render the file or save it.
 *
 * Only images are inline, because only images are needed inline — a photo on a
 * quote is an `<img>`. Everything else downloads, which is what stops a
 * document being rendered as a page on the API's own origin.
 */
function contentDisposition(contentType: string, filename: string): string {
  const mode = contentType.startsWith('image/') ? 'inline' : 'attachment';
  // RFC 5987, so a filename with a space, a quote or an accent survives.
  return `${mode}; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

/**
 * Turns a missing file into a 400 rather than letting it reach the service.
 *
 * `@UploadedFile()` is simply absent when no part was named `file`, which
 * without this would surface as a TypeError and a 500.
 */
function requireFile(file: Express.Multer.File | undefined): {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
} {
  if (!file) {
    throw new BadRequestException('Attach a file in a field named "file"');
  }
  return file;
}
