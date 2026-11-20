import { z } from 'zod';
import { calendarDate } from '../../../common/dto/dates.js';
import { paginationSchema } from '../../../common/dto/pagination.dto.js';
import { createZodDto } from '../../../common/dto/zod-dto.js';
import { phoneDigits } from '../../../common/phone/phone.js';
import { currentPasswordSchema } from '../../auth/dto/account.dto.js';
import { verifyCodeSchema } from '../../auth/dto/verification.dto.js';

const secret = z.string().trim().min(1).max(4096);
const phoneNumberId = z.string().trim().max(40).regex(/^\d+$/, 'Enter the Meta phone number ID');
const graphVersion = z.string().trim().max(20).regex(/^v\d+\.\d+$/, 'Enter a Graph version such as v25.0');

const settingFields = {
  openaiModel: z.string().trim().min(1).max(100).nullable().optional(),
  openaiApiKey: secret.nullable().optional(),
  phoneNumberId: phoneNumberId.nullable().optional(),
  graphVersion: graphVersion.optional(),
  accessToken: secret.nullable().optional(),
  appSecret: secret.nullable().optional(),
  verifyToken: z.string().trim().min(1).max(200).nullable().optional(),
};

export const updateWhatsappSettingsSchema = z.strictObject({
  currentPassword: currentPasswordSchema,
  ...settingFields,
});

export const whatsappImportSchema = z.strictObject(settingFields);
export type WhatsappSettingsChanges = z.infer<typeof whatsappImportSchema>;

export const WHATSAPP_SECRET_FIELDS = ['openaiApiKey', 'accessToken', 'appSecret', 'verifyToken'] as const;

const revealWhatsappSecretSchema = z.strictObject({
  field: z.enum(WHATSAPP_SECRET_FIELDS),
  currentPassword: currentPasswordSchema,
});

const setWhatsappAssistantSchema = z.strictObject({
  enabled: z.boolean(),
  currentPassword: z.string().optional(),
});

const testOpenAiSchema = z.strictObject({ apiKey: secret.optional() });
const testMetaSchema = z.strictObject({
  accessToken: secret.optional(),
  phoneNumberId: phoneNumberId.optional(),
  graphVersion: graphVersion.optional(),
});

export const MAX_WHATSAPP_PHONES = 5;
export const whatsappPhoneLabel = z.string({ error: 'Enter a phone name' })
  .trim().min(1, 'Enter a phone name').max(40, 'Use at most 40 characters');

const sendLinkCodeSchema = z.strictObject({
  phone: z.string().trim().max(40)
    .regex(/^\+?[\d ().-]+$/, 'Enter a phone number with its country code')
    .transform(phoneDigits)
    .pipe(z.string().regex(/^\d{8,15}$/, 'Enter 8 to 15 digits including the country code')),
  currentPassword: currentPasswordSchema,
  // Validate the name in the service after the current-password check.
  label: z.unknown().optional().meta({ type: 'string', minLength: 1, maxLength: 40 }),
}).meta({ required: ['phone', 'currentPassword', 'label'] });

const unlinkPhoneSchema = z.strictObject({ currentPassword: currentPasswordSchema });
const verifyWhatsappPhoneSchema = verifyCodeSchema.strict().extend({ label: whatsappPhoneLabel });
const renameWhatsappPhoneSchema = z.strictObject({ label: whatsappPhoneLabel });
const chronologicalPage = paginationSchema.omit({ search: true, sortBy: true, sortOrder: true });

const queryWhatsappPhonesSchema = chronologicalPage.extend({
  includeArchived: z.stringbool().default(false),
}).strict();

// Reject unused parameters rather than report success for a filter we ignored.
const queryWhatsappHistorySchema = chronologicalPage.extend({
  phoneId: z.uuid().optional(),
  type: z.enum(['messages', 'actions', 'documents', 'settings']).optional(),
  from: calendarDate.optional(),
  to: calendarDate.optional(),
}).strict().refine(({ from, to }) => !from || !to || from <= to, { path: ['to'], message: 'End date must be on or after the start date' });

export type UpdateWhatsappSettings = z.infer<typeof updateWhatsappSettingsSchema>;
export class UpdateWhatsappSettingsDto extends createZodDto(updateWhatsappSettingsSchema) {}
export class SendLinkCodeDto extends createZodDto(sendLinkCodeSchema) {}
export class VerifyWhatsappPhoneDto extends createZodDto(verifyWhatsappPhoneSchema) {}
export class RenameWhatsappPhoneDto extends createZodDto(renameWhatsappPhoneSchema) {}
export class UnlinkWhatsappPhoneDto extends createZodDto(unlinkPhoneSchema) {}
export class QueryWhatsappPhonesDto extends createZodDto(queryWhatsappPhonesSchema) {}
export class QueryWhatsappHistoryDto extends createZodDto(queryWhatsappHistorySchema) {}
export class TestWhatsappOpenAiDto extends createZodDto(testOpenAiSchema) {}
export class TestWhatsappMetaDto extends createZodDto(testMetaSchema) {}
export class RevealWhatsappSecretDto extends createZodDto(revealWhatsappSecretSchema) {}
export class SetWhatsappAssistantDto extends createZodDto(setWhatsappAssistantSchema) {}
