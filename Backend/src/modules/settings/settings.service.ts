import { BadRequestException, Injectable, Logger, NotFoundException, type OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service.js';
import { AuditService } from '../../core/audit/audit.service.js';
import { uploadIdFrom } from '../../common/dto/uploads.js';
import type { AuthenticatedUser } from '../../common/types/api.types.js';
import { UploadsService } from '../uploads/uploads.service.js';
import type { UpdateSettingsInput } from './dto/settings.dto.js';
import {
  brandingView,
  settingsDiff,
  settingsView,
  type SettingsRow,
} from './settings.view.js';

/** The one row's key — held to 1 by a CHECK constraint. */
const SETTINGS_ID = 1;

/**
 * How long a read may be served from memory. Short, so a second API process
 * (a rolling deploy, a second instance) agrees within seconds; a save on this
 * process refreshes it at once.
 */
const CACHE_MS = 15_000;

/**
 * The company's settings — one row, for the whole company.
 *
 * Global: a setting is read by the module it governs (AGENTS.md), so every
 * module may inject this. **Read it when deciding**, never copy a value into
 * a constant: `idleTimeoutMinutes` replaced the `AUTH_IDLE_TIMEOUT_MINUTES`
 * env var precisely so there is one number.
 *
 * `current()` is synchronous for the few callers that decide inside a
 * synchronous rule (the idle limit); it is loaded at boot and refreshed
 * behind reads. Everything else awaits `read()`.
 */
@Injectable()
export class SettingsService implements OnModuleInit {
  private readonly logger = new Logger(SettingsService.name);
  private cached: SettingsRow | null = null;
  private cachedAt = 0;
  private refreshing: Promise<SettingsRow> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly uploads: UploadsService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.load();
  }

  /** The settings now, from memory — refreshed in the background when stale. */
  current(): SettingsRow {
    if (!this.cached) {
      throw new Error('Settings read before the module initialised');
    }
    if (Date.now() - this.cachedAt > CACHE_MS) void this.load().catch(() => undefined);
    return this.cached;
  }

  /** The settings, fresh within `CACHE_MS`. */
  async read(): Promise<SettingsRow> {
    if (this.cached && Date.now() - this.cachedAt <= CACHE_MS) return this.cached;
    return this.load();
  }

  /** One database read at a time, however many requests ask at once. */
  private load(): Promise<SettingsRow> {
    this.refreshing ??= this.fetch()
      .then((row) => {
        this.cached = row;
        this.cachedAt = Date.now();
        return row;
      })
      .finally(() => {
        this.refreshing = null;
      });
    return this.refreshing;
  }

  private async fetch(): Promise<SettingsRow> {
    // The migration inserts the row; the upsert is the backstop for a
    // database restored without it, so a read never fails for want of one.
    const row = await this.prisma.companySettings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID },
      update: {},
    });
    return {
      ...row,
      defaultMarkupPercent: Number(row.defaultMarkupPercent),
      defaultFetPercent: Number(row.defaultFetPercent),
    };
  }

  /** `GET /settings`. */
  async view() {
    return settingsView(await this.read());
  }

  /** `GET /settings/branding` — public. */
  async branding() {
    return brandingView(await this.read());
  }

  /**
   * The logo's bytes for the public route. Vouched for by the settings row:
   * only the one upload it names is ever served without a session, so this
   * is not a way to read any other file.
   */
  async openLogo() {
    const id = uploadIdFrom((await this.read()).logoUrl);
    if (!id) throw new NotFoundException('No logo has been set.');
    return this.uploads.openVouched(id);
  }

  /** `PATCH /settings` — each screen saves its own section. */
  async update(actor: AuthenticatedUser, input: UpdateSettingsInput) {
    const before = await this.load();

    const security = input.security ?? {};
    const timeout = security.idleTimeoutMinutes ?? before.idleTimeoutMinutes;
    const warning = security.idleWarningMinutes ?? before.idleWarningMinutes;
    if (warning >= timeout) {
      throw new BadRequestException({
        idleWarningMinutes: 'The warning must come before the timeout.',
      });
    }

    const logoUrl = input.company?.logoUrl;
    if (logoUrl && logoUrl !== before.logoUrl) {
      await this.uploads.assertUsableImage(actor, uploadIdFrom(logoUrl)!, 'logoUrl');
    }

    const changes = settingsDiff(before, input as Parameters<typeof settingsDiff>[1]);
    if (Object.keys(changes).length === 0) return settingsView(before);

    await this.prisma.companySettings.update({
      where: { id: SETTINGS_ID },
      data: {
        ...input.company,
        ...input.defaults,
        ...input.security,
        ...input.notifications,
        updatedById: actor.id,
      },
    });

    await this.audit.record({
      actorId: actor.id,
      action: 'settings.updated',
      entityType: 'CompanySettings',
      entityId: String(SETTINGS_ID),
      metadata: { changes },
    });
    this.logger.log(`Settings changed by ${actor.id}: ${Object.keys(changes).join(', ')}`);

    return settingsView(await this.load());
  }
}
