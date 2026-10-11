import { z } from 'zod';
import { createZodDto } from '../../../common/dto/zod-dto.js';
import { calendarDate } from '../../../common/dto/dates.js';
import { pageFields } from '../../../common/dto/pagination.dto.js';
import { EXPORT_FORMATS } from '../../../common/export/tabular.js';
import { SERIES_BUCKETS } from '../reports.window.js';

/** Ten years and a day of leap — wide enough for any report, narrow enough not to scan forever. */
const MAX_WINDOW_DAYS = 3660;

const ordered = (value: { from?: Date; to?: Date }) =>
  !value.from || !value.to || value.from.getTime() <= value.to.getTime();

const bounded = (value: { from?: Date; to?: Date }) =>
  !value.from || !value.to || (value.to.getTime() - value.from.getTime()) / 86_400_000 <= MAX_WINDOW_DAYS;

/**
 * The report's window: the first and the last day, both included. The
 * browser works out "This Week", "Q3 2026" or "YTD" from its own today and
 * sends the days, so the API holds one rule rather than a vocabulary of
 * periods to keep in step with the toolbar.
 */
const window = {
  /** First day included, YYYY-MM-DD. */
  from: calendarDate,
  /** Last day included, YYYY-MM-DD. */
  to: calendarDate,
};

const windowChecks = <T extends z.ZodType<{ from?: Date; to?: Date }>>(schema: T) =>
  schema
    .refine(ordered, { message: '`from` must be on or before `to`', path: ['from'] })
    .refine(bounded, { message: `A report window can span at most ${MAX_WINDOW_DAYS} days`, path: ['to'] });

export const reportWindowSchema = windowChecks(z.object(window).strict());
export type ReportWindowInput = z.infer<typeof reportWindowSchema>;
export class ReportWindowDto extends createZodDto(reportWindowSchema) {}

/** A ranking — brokers, clients, routes — over the window, paged, largest revenue first. */
export const reportRankingSchema = windowChecks(z.object({ ...window, ...pageFields }).strict());
export type ReportRankingInput = z.infer<typeof reportRankingSchema>;
export class ReportRankingDto extends createZodDto(reportRankingSchema) {}

export const reportSeriesSchema = z
  .object({
    /**
     * WEEK: the twelve weeks ending with the one containing `on`. MONTH: the
     * twelve months of its year. YEAR: the five years ending with its year.
     */
    bucket: z.enum(SERIES_BUCKETS).default('MONTH'),
    /** The day the chart is anchored on — the report's last day. Default today (UTC). */
    on: calendarDate.optional(),
  })
  .strict();
export type ReportSeriesInput = z.infer<typeof reportSeriesSchema>;
export class ReportSeriesDto extends createZodDto(reportSeriesSchema) {}

export const reportExportSchema = windowChecks(
  z
    .object({
      /** Omit both `from` and `to` to export every operation on record. */
      from: calendarDate.optional(),
      to: calendarDate.optional(),
      format: z.enum(EXPORT_FORMATS).default('CSV'),
    })
    .strict(),
).refine((value) => (value.from === undefined) === (value.to === undefined), {
  message: 'Send both `from` and `to`, or neither for every operation',
  path: ['to'],
});
export type ReportExportInput = z.infer<typeof reportExportSchema>;
export class ReportExportDto extends createZodDto(reportExportSchema) {}
