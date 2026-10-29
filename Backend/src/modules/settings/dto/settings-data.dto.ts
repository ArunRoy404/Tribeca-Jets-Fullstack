import { z } from 'zod';
import { createZodDto } from '../../../common/dto/zod-dto.js';
import { calendarDate } from '../../../common/dto/dates.js';
import { EXPORT_FORMATS } from '../../../common/export/tabular.js';

export const EXPORT_SCOPES = [
  'ALL',
  'CLIENTS',
  'TRIPS',
  'QUOTES',
  'RECEIVABLES',
  'OPERATOR_PAYMENTS',
  'COMMISSIONS',
] as const;
export type ExportScope = (typeof EXPORT_SCOPES)[number];

export const IMPORT_TYPES = ['CLIENTS', 'OPERATORS', 'AIRCRAFT', 'AIRPORTS'] as const;
export type ImportType = (typeof IMPORT_TYPES)[number];

export const IMPORT_TARGET_FIELDS: Record<ImportType, readonly string[]> = {
  CLIENTS: ['Client Name', 'Primary Email', 'Primary Phone', 'Lead Source', 'Preferred Airports'],
  OPERATORS: ['Operator Name', 'Email', 'Phone', 'Certification', 'Base Airport'],
  AIRCRAFT: ['Tail Number', 'Model', 'Category', 'Seats', 'Operator'],
  AIRPORTS: ['ICAO', 'IATA', 'Name', 'City', 'Country'],
};

export const SKIP_COLUMN = '__skip';

export const settingsExportSchema = z
  .object({
    scope: z.enum(EXPORT_SCOPES).default('ALL'),
    format: z.enum(EXPORT_FORMATS).default('XLSX'),
    from: calendarDate.optional(),
    to: calendarDate.optional(),
    includeArchived: z.stringbool().default(false),
  })
  .strict()
  .refine((value) => !value.from || !value.to || value.from.getTime() <= value.to.getTime(), {
    message: '`from` must be on or before `to`',
    path: ['from'],
  })
  .refine((value) => !(value.scope === 'ALL' && value.format === 'CSV'), {
    message:
      'All CRM Records spans multiple tables and can only be exported as XLSX. Choose a single scope to export as CSV.',
    path: ['format'],
  });

export type SettingsExportInput = z.infer<typeof settingsExportSchema>;
export class SettingsExportDto extends createZodDto(settingsExportSchema) {}

const mappingSchema = z
  .string()
  .optional()
  .transform((raw, ctx): Record<string, string> | undefined => {
    if (!raw || !raw.trim()) return undefined;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        ctx.addIssue({ code: 'custom', message: '`mapping` must be a JSON object mapping source columns to targets.' });
        return z.NEVER;
      }
      const out: Record<string, string> = {};
      for (const [key, val] of Object.entries(parsed as Record<string, unknown>)) {
        if (typeof val === 'string') out[key] = val;
      }
      return out;
    } catch {
      ctx.addIssue({ code: 'custom', message: '`mapping` must be valid JSON.' });
      return z.NEVER;
    }
  });

export const settingsImportFieldsSchema = z
  .object({
    type: z.enum(IMPORT_TYPES),
    mapping: mappingSchema,
  })
  .strict();

export type SettingsImportFieldsInput = z.infer<typeof settingsImportFieldsSchema>;
export class SettingsImportFieldsDto extends createZodDto(settingsImportFieldsSchema) {}

