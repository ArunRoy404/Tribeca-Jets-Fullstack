import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common';
import { lastFour, SecretBox, SecretOpenError } from '../../common/crypto/secret-box.js';
import { AppConfigService } from '../../config/config.service.js';
import { AuditService } from '../../core/audit/audit.service.js';
import { PrismaService } from '../../core/prisma/prisma.service.js';
import type { Prisma, WhatsappSettings } from '../../generated/prisma/client.js';
import { AuthService } from '../auth/auth.service.js';
import type { SessionContext } from '../auth/token.service.js';
import {
  MAX_WHATSAPP_PHONES, WHATSAPP_SECRET_FIELDS, whatsappImportSchema, type RevealWhatsappSecretDto, type SetWhatsappAssistantDto,
  type UpdateWhatsappSettings, type WhatsappSettingsChanges,
} from './dto/whatsapp-settings.dto.js';
import { WhatsappEvent } from './whatsapp-history.events.js';

export interface WhatsappConfig {
  accessToken: string;
  appSecret: string;
  verifyToken: string;
  phoneNumberId: string;
  graphVersion: string;
}

export const WHATSAPP_SETTINGS_ID = 1;
const SETTINGS_ID = WHATSAPP_SETTINGS_ID;
const CACHE_MS = 15_000;
const META_FIELDS = ['phoneNumberId', 'accessToken', 'appSecret', 'verifyToken'] as const;
type PanelFields = Pick<WhatsappSettings, typeof WHATSAPP_SECRET_FIELDS[number] | 'openaiModel' | 'phoneNumberId' | 'graphVersion'>;
type LoadedSettings = PanelFields & Pick<WhatsappSettings, 'assistantEnabled'>;
type Field = keyof PanelFields;
type LegacySettings = Partial<Record<Field, string>>;
const FIELDS = Object.keys(whatsappImportSchema.shape) as Field[];

function secretView(value: string | null) {
  const last4 = value === null ? null : lastFour(value);
  return { set: value !== null, last4, masked: value === null ? null : '•'.repeat(12) + (last4 ?? '') };
}

function metaState({ phoneNumberId, accessToken, appSecret, verifyToken, graphVersion }: PanelFields) {
  const fields = { phoneNumberId, accessToken, appSecret, verifyToken };
  const missing = META_FIELDS.filter((field) => !fields[field]);
  // The missing-field list is also the webhook's configuration check.
  const config = missing.length ? null : { ...fields, graphVersion } as WhatsappConfig;
  return { config, missing };
}

function aiConfig({ openaiApiKey, openaiModel }: PanelFields) {
  return openaiApiKey && openaiModel ? { apiKey: openaiApiKey, model: openaiModel } : null;
}

@Injectable()
export class WhatsappSettingsService {
  private readonly logger = new Logger(WhatsappSettingsService.name);
  // A write in the API process clears the cache immediately. The import CLI
  // uses its own process, so cached reads also expire.
  private cached: Promise<LoadedSettings> | undefined;
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

  private async fetch(): Promise<LoadedSettings> {
    const row = await this.readRow();
    return {
      openaiModel: row.openaiModel,
      phoneNumberId: row.phoneNumberId,
      graphVersion: row.graphVersion,
      assistantEnabled: row.assistantEnabled,
      openaiApiKey: this.open(row.openaiApiKey),
      accessToken: this.open(row.accessToken),
      appSecret: this.open(row.appSecret),
      verifyToken: this.open(row.verifyToken),
    };
  }

  private load(): Promise<LoadedSettings> {
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
    return metaState(await this.load()).config;
  }

  async ai(): Promise<{ apiKey: string; model: string } | null> {
    if (!this.secrets.ready) return null;
    return aiConfig(await this.load());
  }

  async assistantEnabled(): Promise<boolean> {
    return (await this.load()).assistantEnabled;
  }

  async openAiTestKey(): Promise<string | null> {
    return this.secrets.ready ? (await this.load()).openaiApiKey : null;
  }

  async metaTestSettings() {
    const { accessToken, phoneNumberId, graphVersion } = await this.load();
    return { accessToken, phoneNumberId, graphVersion };
  }

  async view(userId: string) {
    const [row, phonesLinked] = await Promise.all([
      this.load(),
      this.prisma.whatsappPhone.count({ where: { userId, deletedAt: null } }),
    ]);
    const origin = this.config.apiPublicUrl.replace(/\/+$/, '');
    const encryptionReady = this.secrets.ready;
    const meta = metaState(row);
    return {
      openaiModel: row.openaiModel,
      phoneNumberId: row.phoneNumberId,
      graphVersion: row.graphVersion,
      openaiApiKey: secretView(row.openaiApiKey),
      accessToken: secretView(row.accessToken),
      appSecret: secretView(row.appSecret),
      verifyToken: secretView(row.verifyToken),
      encryptionReady,
      assistantEnabled: row.assistantEnabled,
      readiness: {
        openai: aiConfig(row) !== null,
        meta: meta.config !== null,
        metaMissing: meta.missing,
        phonesLinked,
        phoneLimit: MAX_WHATSAPP_PHONES,
        encryptionReady,
      },
      webhookUrl: `${origin}/api/webhooks/whatsapp`,
    };
  }

  async update(userId: string, input: UpdateWhatsappSettings, context: SessionContext) {
    await this.auth.assertPassword(userId, input.currentPassword);
    const { currentPassword: _password, ...changes } = input;
    const fields = FIELDS.filter((field) => changes[field] !== undefined);
    if (!fields.length) return this.view(userId);

    if (!await this.save(changes, fields, userId, WhatsappEvent.SETTINGS_UPDATED, context)) {
      throw new ConflictException('WhatsApp settings changed. Please try again.');
    }
    return this.view(userId);
  }

  async setAssistant(userId: string, { enabled, currentPassword }: SetWhatsappAssistantDto, context: SessionContext) {
    if (enabled) {
      if (!currentPassword) throw new BadRequestException('currentPassword is required to switch on the assistant');
      await this.auth.assertPassword(userId, currentPassword);
    }
    const changes = { assistantEnabled: enabled, updatedById: userId };
    await this.prisma.whatsappSettings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, createdById: userId, ...changes },
      update: changes,
    });
    this.cached = undefined;
    await this.audit.record({
      actorId: userId,
      action: enabled ? WhatsappEvent.SWITCHED_ON : WhatsappEvent.SWITCHED_OFF,
      entityType: 'WhatsappSettings',
      entityId: String(SETTINGS_ID),
      ...context,
    });
    return this.view(userId);
  }

  async reveal(userId: string, { field, currentPassword }: RevealWhatsappSecretDto, context: SessionContext) {
    await this.auth.assertPassword(userId, currentPassword);
    this.requireEncryption();
    const sealed = (await this.readRow())[field];
    if (sealed === null) throw new BadRequestException('That secret is not set');

    let value: string;
    try {
      value = this.secrets.openSecret(sealed);
    } catch (error) {
      if (!(error instanceof SecretOpenError)) throw error;
      throw new ConflictException("That secret cannot be read with this server's key. Replace it.");
    }
    await this.audit.record({
      actorId: userId,
      action: WhatsappEvent.SETTINGS_REVEALED,
      entityType: 'WhatsappSettings',
      entityId: String(SETTINGS_ID),
      metadata: { field },
      ...context,
    });
    return { field, value };
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
    action: typeof WhatsappEvent.SETTINGS_UPDATED | 'whatsapp_settings.imported',
    context: SessionContext,
    expected: Prisma.WhatsappSettingsWhereInput = {},
  ): Promise<boolean> {
    const data = { ...changes };
    for (const field of WHATSAPP_SECRET_FIELDS) {
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
