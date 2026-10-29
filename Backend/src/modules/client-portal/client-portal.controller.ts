import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '../../common/decorators/public.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { StaffOnly } from '../../common/decorators/access.decorator.js';
import { AccessGuard } from '../../common/guards/access.guard.js';
import type { AuthenticatedUser } from '../../common/types/api.types.js';
import { PDF_CONTENT_TYPE } from '../../common/pdf/pdf.document.js';
import { contentDisposition } from '../uploads/uploads.rules.js';
import { ClientPortalService } from './client-portal.service.js';
import { RespondQuotePortalDto } from './dto/client-portal.dto.js';

@ApiTags('Client Portal')
@Controller('client-portal')
export class ClientPortalController {
  constructor(private readonly portal: ClientPortalService) {}

  @Get('link/:clientId')
  @StaffOnly()
  @UseGuards(AccessGuard)
  @ApiOperation({
    summary: 'Issue a signed Client Portal link for a client',
    description:
      'Staff-only endpoint that verifies the caller may read the client (`ClientsService.findOne`) and returns a signed 90-day portal token and path (`/client-portal/:token`).',
  })
  issueLink(
    @CurrentUser() user: AuthenticatedUser,
    @Param('clientId', ParseUUIDPipe) clientId: string,
  ) {
    return this.portal.issueLink(user, clientId);
  }

  @Public()
  @Get(':token')
  @ApiOperation({
    summary: 'Client Portal overview',
    description:
      'Verifies the signed portal token and returns the client profile, assigned charter advisor, credit balance, sent/answered quotes (without internal cost or margin), live trips with itineraries, sent invoices, and non-sensitive vault documents.',
  })
  overview(@Param('token') token: string) {
    return this.portal.overview(token);
  }

  @Public()
  @Post(':token/quotes/:quoteId/respond')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Approve or decline a sent quote from the Client Portal',
    description:
      'Allows the client to approve or decline an open quote (`SENT` / `VIEWED`) with optional notes, enforcing the one-approved-quote-per-request rule and recording the decision in the audit trail.',
  })
  respondToQuote(
    @Param('token') token: string,
    @Param('quoteId', ParseUUIDPipe) quoteId: string,
    @Body() body: RespondQuotePortalDto,
  ) {
    return this.portal.respondToQuote(token, quoteId, body);
  }

  @Public()
  @Get(':token/quotes/:quoteId/pdf')
  @Header('X-Content-Type-Options', 'nosniff')
  @ApiProduces(PDF_CONTENT_TYPE)
  @ApiOperation({
    summary: 'Download a Quote PDF from the Client Portal',
  })
  async quotePdf(
    @Param('token') token: string,
    @Param('quoteId', ParseUUIDPipe) quoteId: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const file = await this.portal.quotePdf(token, quoteId);
    response.setHeader('Content-Type', file.contentType);
    response.setHeader('Content-Length', String(file.body.length));
    response.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    return new StreamableFile(file.body);
  }

  @Public()
  @Get(':token/itineraries/:itineraryId/pdf')
  @Header('X-Content-Type-Options', 'nosniff')
  @ApiProduces(PDF_CONTENT_TYPE)
  @ApiOperation({
    summary: 'Download a Passenger Itinerary PDF from the Client Portal',
  })
  async itineraryPdf(
    @Param('token') token: string,
    @Param('itineraryId', ParseUUIDPipe) itineraryId: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const file = await this.portal.itineraryPdf(token, itineraryId);
    response.setHeader('Content-Type', file.contentType);
    response.setHeader('Content-Length', String(file.body.length));
    response.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    return new StreamableFile(file.body);
  }

  @Public()
  @Get(':token/invoices/:invoiceId/pdf')
  @Header('X-Content-Type-Options', 'nosniff')
  @ApiProduces(PDF_CONTENT_TYPE)
  @ApiOperation({
    summary: 'Download a Client Invoice PDF from the Client Portal',
  })
  async invoicePdf(
    @Param('token') token: string,
    @Param('invoiceId', ParseUUIDPipe) invoiceId: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const file = await this.portal.invoicePdf(token, invoiceId);
    response.setHeader('Content-Type', file.contentType);
    response.setHeader('Content-Length', String(file.body.length));
    response.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    return new StreamableFile(file.body);
  }

  @Public()
  @Get(':token/documents/:documentId/file')
  @Header('X-Content-Type-Options', 'nosniff')
  @ApiOperation({
    summary: 'Download a non-sensitive client document from the Client Portal',
  })
  async documentFile(
    @Param('token') token: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const file = await this.portal.documentFile(token, documentId);
    response.setHeader('Content-Type', file.contentType);
    response.setHeader('Content-Length', String(file.size));
    response.setHeader('Content-Disposition', contentDisposition(file));
    return new StreamableFile(file.stream);
  }
}
