import { z } from 'zod';
import { createZodDto } from '../../../common/dto/zod-dto.js';
import { phoneDigits } from '../../../common/phone/phone.js';
import { currentPasswordSchema } from '../../auth/dto/account.dto.js';

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

const testOpenAiSchema = z.strictObject({ apiKey: secret.optional() });
const testMetaSchema = z.strictObject({
  accessToken: secret.optional(),
  phoneNumberId: phoneNumberId.optional(),
  graphVersion: graphVersion.optional(),
});

const sendLinkCodeSchema = z.strictObject({
  phone: z.string().trim().max(40)
    .regex(/^\+?[\d ().-]+$/, 'Enter a phone number with its country code')
    .transform(phoneDigits)
    .pipe(z.string().regex(/^\d{8,15}$/, 'Enter 8 to 15 digits including the country code')),
  currentPassword: currentPasswordSchema,
});

const unlinkPhoneSchema = z.strictObject({ currentPassword: currentPasswordSchema });

export type UpdateWhatsappSettings = z.infer<typeof updateWhatsappSettingsSchema>;
export class UpdateWhatsappSettingsDto extends createZodDto(updateWhatsappSettingsSchema) {}
export class SendLinkCodeDto extends createZodDto(sendLinkCodeSchema) {}
export class UnlinkWhatsappPhoneDto extends createZodDto(unlinkPhoneSchema) {}
export class TestWhatsappOpenAiDto extends createZodDto(testOpenAiSchema) {}
export class TestWhatsappMetaDto extends createZodDto(testMetaSchema) {}
