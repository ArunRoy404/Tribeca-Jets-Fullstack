import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common';
import { lastFour, SecretBox, SecretOpenError } from '../../common/crypto/secret-box.js';
import { AppConfigService } from '../../config/config.service.js';
import { AuditService } from '../../core/audit/audit.service.js';
import { PrismaService } from '../../core/prisma/prisma.service.js';
import type { Prisma, WhatsappSettings } from '../../generated/prisma/client.js';
import { AuthService } from '../auth/auth.service.js';
import type { SessionContext } from '../auth/token.service.js';
import { whatsappImportSchema, type UpdateWhatsappSettings, type WhatsappSettingsChanges } from './dto/whatsapp-settings.dto.js';

export interface WhatsappConfig {
  accessToken: string;
  appSecret: string;
  verifyToken: string;
  phoneNumberId: string;
  graphVersion: string;
}

const SETTINGS_ID = 1;
const CACHE_MS = 15_000;
const SECRET_FIELDS = ['openaiApiKey', 'accessToken', 'appSecret', 'verifyToken'] as const;
type PanelFields = Pick<WhatsappSettings, typeof SECRET_FIELDS[number] | 'openaiModel' | 'phoneNumberId' | 'graphVersion'>;
type Field = keyof PanelFields;
type LegacySettings = Partial<Record<Field, string>>;
const FIELDS = Object.keys(whatsappImportSchema.shape) as Field[];

function secretView(value: string | null) {
  return { set: value !== null, last4: value === null ? null : lastFour(value) };
}

@Injectable()
export class WhatsappSettingsService {
  private readonly logger = new Logger(WhatsappSettingsService.name);
  // A write in the API process clears the cache immediately. The import CLI
  // uses its own process, so cached reads also expire.
  private cached: Promise<PanelFields> | undefined;
  private cacheUntil = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly secrets: SecretBox,
    private readonly config: AppConfigService,
    private readonly auth: AuthService,
    private readonly audit: AuditService,
  ) {}

  private open(value: string | null): string | null {
    if (value === null || !this.secrets.ready) return null;
    try {
      return this.secrets.openSecret(value);
    } catch (error) {
      if (!(error instanceof SecretOpenError)) throw error;
      this.logger.warn(error.name);
      return null;
    }
  }

  private readRow() {
    return this.prisma.whatsappSettings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID },
      update: {},
    });
  }

  private async fetch(): Promise<PanelFields> {
    const row = await this.readRow();
    return {
      openaiModel: row.openaiModel,
      phoneNumberId: row.phoneNumberId,
      graphVersion: row.graphVersion,
      openaiApiKey: this.open(row.openaiApiKey),
      accessToken: this.open(row.accessToken),
      appSecret: this.open(row.appSecret),
      verifyToken: this.open(row.verifyToken),
    };
  }

  private load(): Promise<PanelFields> {
    if (this.cached && Date.now() < this.cacheUntil) return this.cached;
    const loading = this.fetch().catch((error: unknown) => {
      if (this.cached === loading) this.cached = undefined;
      throw error;
    });
    this.cached = loading;
    this.cacheUntil = Date.now() + CACHE_MS;
    return loading;
  }

  async current(): Promise<WhatsappConfig | null> {
    if (!this.secrets.ready) return null;
    const { accessToken, appSecret, verifyToken, phoneNumberId, graphVersion } = await this.load();
    if (!accessToken || !appSecret || !verifyToken || !phoneNumberId) return null;
    return { accessToken, appSecret, verifyToken, phoneNumberId, graphVersion };
  }

  async ai(): Promise<{ apiKey: string; model: string } | null> {
    if (!this.secrets.ready) return null;
    const { openaiApiKey, openaiModel } = await this.load();
    return openaiApiKey && openaiModel ? { apiKey: openaiApiKey, model: openaiModel } : null;
  }

  async openAiTestKey(): Promise<string | null> {
    return this.secrets.ready ? (await this.load()).openaiApiKey : null;
  }

  async metaTestSettings() {
    const { accessToken, phoneNumberId, graphVersion } = await this.load();
    return { accessToken, phoneNumberId, graphVersion };
  }

  async view(userId: string) {
    const [row, user] = await Promise.all([
      this.load(),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { whatsappPhone: true, whatsappPhoneVerifiedAt: true },
      }),
    ]);
    const origin = this.config.apiPublicUrl.replace(/\/+$/, '');
    return {
      openaiModel: row.openaiModel,
      phoneNumberId: row.phoneNumberId,
      graphVersion: row.graphVersion,
      openaiApiKey: secretView(row.openaiApiKey),
      accessToken: secretView(row.accessToken),
      appSecret: secretView(row.appSecret),
      verifyToken: secretView(row.verifyToken),
      encryptionReady: this.secrets.ready,
      linkedPhone: user?.whatsappPhone && user.whatsappPhoneVerifiedAt
        ? { phone: user.whatsappPhone, verifiedAt: user.whatsappPhoneVerifiedAt }
        : null,
      webhookUrl: `${origin}/api/webhooks/whatsapp`,
    };
  }

  async update(userId: string, input: UpdateWhatsappSettings, context: SessionContext) {
    await this.auth.assertPassword(userId, input.currentPassword);
    const { currentPassword: _password, ...changes } = input;
    const fields = FIELDS.filter((field) => changes[field] !== undefined);
    if (!fields.length) return this.view(userId);

    if (!await this.save(changes, fields, userId, 'whatsapp_settings.updated', context)) {
      throw new ConflictException('WhatsApp settings changed. Please try again.');
    }
    return this.view(userId);
  }

  async importLegacy(values: LegacySettings) {
    this.requireEncryption();
    const supplied = FIELDS.flatMap((field) => {
      if (!values[field]?.trim()) return [];
      const parsed = whatsappImportSchema.shape[field].safeParse(values[field]);
      return parsed.success ? [{ field, value: parsed.data }] : [];
    });

    for (let attempt = 0; attempt < 3; attempt++) {
      // Look at stored ciphertext so an unreadable credential stays occupied.
      const stored = await this.readRow();
      const empty = supplied.filter(({ field }) => stored[field] === null || stored[field] === '');
      const imported = empty.map(({ field }) => field);
      const skipped = FIELDS.filter((field) => !imported.includes(field));
      if (!imported.length) return { imported, skipped };

      const changes = Object.fromEntries(empty.map(({ field, value }) => [field, value]));
      const expected = Object.fromEntries(imported.map((field) => [field, stored[field]]));
      if (await this.save(changes, imported, null, 'whatsapp_settings.imported', {}, expected)) {
        return { imported, skipped };
      }
    }
    throw new ConflictException('WhatsApp settings changed during import. Run the import again.');
  }

  private requireEncryption() {
    if (!this.secrets.ready) {
      throw new BadRequestException('Set SETTINGS_ENCRYPTION_KEY on the server first');
    }
  }

  private async save(
    changes: WhatsappSettingsChanges,
    fields: Field[],
    userId: string | null,
    action: 'whatsapp_settings.updated' | 'whatsapp_settings.imported',
    context: SessionContext,
    expected: Prisma.WhatsappSettingsWhereInput = {},
  ): Promise<boolean> {
    const data = { ...changes };
    for (const field of SECRET_FIELDS) {
      const value = changes[field];
      if (value === undefined) continue;
      this.requireEncryption();
      data[field] = value === null ? null : this.secrets.sealSecret(value);
    }
    if (userId !== null) await this.load();
    // Match the fields read by the importer in the same write so a concurrent
    // panel save wins and the importer retries with the remaining empty fields.
    const { count } = await this.prisma.whatsappSettings.updateMany({
      where: { ...expected, id: SETTINGS_ID },
      data: { ...data, updatedById: userId },
    });
    if (count !== 1) return false;
    this.cached = undefined;
    await this.audit.record({
      actorId: userId,
      action,
      entityType: 'WhatsappSettings',
      entityId: String(SETTINGS_ID),
      metadata: { fields },
      ...context,
    });
    return true;
  }
}
