import { Body, Controller, Get, Header, Patch, Res, StreamableFile } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { RateLimit } from '../../common/decorators/rate-limit.decorator.js';
import { RequireAccess } from '../../common/decorators/access.decorator.js';
import { Action, Module } from '../../common/authorization/access.js';
import type { AuthenticatedUser } from '../../common/types/api.types.js';
import { contentDisposition } from '../uploads/uploads.rules.js';
import { UpdateSettingsDto } from './dto/settings.dto.js';
import { SettingsService } from './settings.service.js';

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
