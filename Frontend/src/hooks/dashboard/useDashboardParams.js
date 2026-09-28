"use client";

import { useTableQueryParams } from "@/hooks/common/useTableQueryParams";
import { DASHBOARD_PERIODS, DEFAULT_DASHBOARD_PERIOD } from "@/lib/dashboard";

const SCHEMA = {
  /** The tiles' window. In the URL so a reload or a shared link keeps it. */
  period: {
    default: DEFAULT_DASHBOARD_PERIOD,
    parse: (raw) => (DASHBOARD_PERIODS.includes(raw) ? raw : undefined),
  },
};

/** URL state for the overview: only the period filter. */
export function useDashboardParams() {
  const { values, setters } = useTableQueryParams(SCHEMA);
  return { period: values.period, setPeriod: setters.setPeriod };
}
