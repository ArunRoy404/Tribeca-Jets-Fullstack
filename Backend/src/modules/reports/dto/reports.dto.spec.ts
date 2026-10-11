import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  reportExportSchema,
  reportRankingSchema,
  reportSeriesSchema,
  reportWindowSchema,
} from './reports.dto.js';

describe('report DTOs', () => {
  it('describe themselves, so /api/docs can render them', () => {
    for (const schema of [reportWindowSchema, reportRankingSchema, reportSeriesSchema, reportExportSchema]) {
      const json = z.toJSONSchema(schema, { io: 'input' }) as { properties?: Record<string, unknown> };
      expect(Object.keys(json.properties ?? {}).length).toBeGreaterThan(0);
    }
  });

  it('refuses a window that ends before it starts', () => {
    expect(reportWindowSchema.safeParse({ from: '2026-10-05', to: '2026-10-01' }).success).toBe(false);
    expect(reportWindowSchema.safeParse({ from: '2026-10-01', to: '2026-10-01' }).success).toBe(true);
  });

  it('refuses a window over ten years', () => {
    expect(reportWindowSchema.safeParse({ from: '2010-01-01', to: '2026-01-01' }).success).toBe(false);
  });

  it('refuses a parameter it would ignore', () => {
    expect(reportWindowSchema.safeParse({ from: '2026-10-01', to: '2026-10-31', search: 'x' }).success).toBe(false);
    expect(reportRankingSchema.safeParse({ from: '2026-10-01', to: '2026-10-31', sortBy: 'revenue' }).success).toBe(
      false,
    );
  });

  it('exports a window or everything, never half a window', () => {
    expect(reportExportSchema.safeParse({ format: 'XLSX' }).success).toBe(true);
    expect(reportExportSchema.safeParse({ from: '2026-10-01', to: '2026-10-31' }).success).toBe(true);
    expect(reportExportSchema.safeParse({ from: '2026-10-01' }).success).toBe(false);
    expect(reportExportSchema.safeParse({ format: 'PDF' }).success).toBe(false);
  });
});
