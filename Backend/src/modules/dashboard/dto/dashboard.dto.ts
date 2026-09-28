import { z } from 'zod';
import { createZodDto } from '../../../common/dto/zod-dto.js';
import { calendarDate } from '../../../common/dto/dates.js';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../../../common/dto/pagination.dto.js';
import { DASHBOARD_PERIODS } from '../dashboard.period.js';

/**
 * The desk's today, as the browser sees it — so a desk in New York at 9pm
 * is not shown tomorrow's priorities. Default today in UTC.
 */
const on = calendarDate.optional();

/**
 * Page and size only. `.strict()` because these lists are fixed orders — no
 * search, no sort — and a parameter silently ignored is a wrong answer, not
 * a lenient one (AGENTS.md, the timeline rule).
 */
const page = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
};

export const dashboardSummarySchema = z
  .object({
    /** The window the money tiles count, and the one before it they compare with. Default WEEK. */
    period: z.enum(DASHBOARD_PERIODS).default('WEEK'),
    on,
  })
  .strict();
export type DashboardSummaryInput = z.infer<typeof dashboardSummarySchema>;
export class DashboardSummaryDto extends createZodDto(dashboardSummarySchema) {}

export const dashboardPrioritiesSchema = z.object({ ...page, on }).strict();
export type DashboardPrioritiesInput = z.infer<typeof dashboardPrioritiesSchema>;
export class DashboardPrioritiesDto extends createZodDto(dashboardPrioritiesSchema) {}

export const dashboardActivitySchema = z.object(page).strict();
export type DashboardActivityInput = z.infer<typeof dashboardActivitySchema>;
export class DashboardActivityDto extends createZodDto(dashboardActivitySchema) {}
