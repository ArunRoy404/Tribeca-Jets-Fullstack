import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
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
import { UploadKind } from '../../generated/prisma/enums.js';
import { UploadsService, type IncomingFile } from './uploads.service.js';
import { UploadResponseDto } from './dto/upload.dto.js';
import { MAX_UPLOAD_BYTES, UPLOAD_KIND_RULES } from './uploads.rules.js';

/**
 * One upload surface for the whole product.
 *
 * A screen posts a file here, gets back a URL, and stores that URL on whatever
 * record it was editing. Nothing here knows or cares what the file is *for* —
 * that is the business of the record holding the URL — which is what lets a
 * photograph be chosen on a create form, before the record it belongs to
 * exists.
 *
 * **There is no permission decorator, and that is deliberate.** Uploading is
 * available to anyone with a session, because every write these files attach to
 * is already guarded by the permission for *that* record: a broker who cannot
 * edit an aircraft cannot save a photograph onto one, whatever they managed to
 * upload. Gating the upload as well would mean inventing a permission per
 * screen, which is exactly the coupling this design removes.
 *
 * Reads still require a session — `JwtAuthGuard` is global and nothing here is
 * `@Public()` — so there is no unauthenticated path to any stored object.
 */
@ApiTags('Uploads')
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  // ---------------------------------------------------------------------------
  // Writing
  // ---------------------------------------------------------------------------

  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: `An image. Accepted: ${UPLOAD_KIND_RULES.IMAGE.accept.join(', ')}. Maximum 15 MB.`,
        },
      },
    },
  })
  @ApiOperation({
    summary: 'Upload an image',
    description:
      'Stores the file under `images/` and returns the URL to save on whatever record is being edited. ' +
      'The content type is read from the bytes, never from the upload header, so renaming a file changes nothing. ' +
      'SVG is refused: it is a document that executes script, and serving one from this origin would be stored XSS. ' +
      'Re-uploading a file this user has already uploaded returns the existing record with `deduplicated: true` — ' +
      'no second copy is written and no new id is issued.',
  })
  @ApiResponse({ status: 201, type: UploadResponseDto })
  async uploadImage(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: IncomingFile | undefined,
  ) {
    return this.uploads.create(user, UploadKind.IMAGE, requireFile(file));
  }

  @Post('document')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: `A document. Accepted: ${UPLOAD_KIND_RULES.DOCUMENT.accept.join(', ')}. Maximum 25 MB.`,
        },
      },
    },
  })
  @ApiOperation({
    summary: 'Upload a document',
    description:
      'Stores the file under `documents/` and returns the URL to save on whatever record is being edited. ' +
      'Accepts PDF, DOCX, XLSX, CSV and plain text. Legacy .doc and .xls are refused — both are OLE2 and are ' +
      'byte-identical at the header, so telling them apart would mean trusting the sender. ' +
      'Re-uploading a file this user has already uploaded returns the existing record with `deduplicated: true`.',
  })
  @ApiResponse({ status: 201, type: UploadResponseDto })
  async uploadDocument(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: IncomingFile | undefined,
  ) {
    return this.uploads.create(user, UploadKind.DOCUMENT, requireFile(file));
  }

  // ---------------------------------------------------------------------------
  // Reading
  // ---------------------------------------------------------------------------

  @Get(':id')
  // Never let a browser second-guess the stored type. Without this, a file
  // sniffed as text but containing markup can still be rendered as HTML.
  @Header('X-Content-Type-Options', 'nosniff')
  @ApiOperation({
    summary: 'Fetch a file',
    description:
      'Streams the bytes. This is the address returned by the upload routes and stored on records — ' +
      'it works directly in an `<img src>`, because the session is an httpOnly cookie and needs no token in the URL. ' +
      'Images are served `inline`; everything else downloads, so a document can never execute in the page. ' +
      'Requires a session: there is no unauthenticated path to a stored file.',
  })
  @ApiResponse({ status: 200, description: 'The file.' })
  async serve(
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const file = await this.uploads.openStream(id);

    response.setHeader('Content-Type', file.contentType);
    response.setHeader('Content-Length', String(file.size));
    response.setHeader('Content-Disposition', contentDisposition(file));

    return new StreamableFile(file.stream);
  }

  @Get(':id/meta')
  @ApiOperation({
    summary: 'Describe a file without downloading it',
    description:
      'The record behind a stored URL — filename, type, size and whether it has been removed. ' +
      'For a screen that shows an attachment as a row rather than rendering it.',
  })
  async meta(@Param('id', ParseUUIDPipe) id: string) {
    return this.uploads.findOne(id);
  }

  // ---------------------------------------------------------------------------
  // Removing
  // ---------------------------------------------------------------------------

  @Delete(':id')
  @ApiOperation({
    summary: 'Remove a file',
    description:
      'Archives the record; the bytes stay in storage. Nothing in this system is permanently deleted, ' +
      'and the object is content-addressed, so it may be shared with another user who uploaded the same file — ' +
      'erasing it here would break a record this request never looked at.',
  })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.uploads.remove(user, id);
  }

  @Post(':id/restore')
  // A restore creates nothing — it clears a deletion stamp on a row that
  // existed all along — so it answers 200, not the 201 Nest gives every POST.
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Restore a removed file',
    description: 'Clears the deletion stamp and touches nothing else.',
  })
  async restore(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.uploads.restore(user, id);
  }
}

/**
 * `@UploadedFile()` is simply absent when no part was named `file`, so without
 * this the service would receive `undefined` and fail on a property access
 * rather than telling the caller what was wrong with their request.
 */
function requireFile(file: IncomingFile | undefined): IncomingFile {
  if (!file) {
    throw new BadRequestException(
      'No file was received. Send it as multipart/form-data in a part named "file".',
    );
  }
  return file;
}

/**
 * Images render in the page; everything else downloads.
 *
 * This is the second half of `nosniff`: a PDF that is secretly HTML is stored
 * as `text/plain`, and an attachment disposition means the browser saves it
 * instead of executing it on the API's own origin with the session cookie
 * attached.
 */
function contentDisposition(file: {
  contentType: string;
  filename: string;
}): string {
  const mode = file.contentType.startsWith('image/') ? 'inline' : 'attachment';
  // RFC 5987, so a filename with a space, a quote or an accent survives.
  return `${mode}; filename*=UTF-8''${encodeURIComponent(file.filename)}`;
}
