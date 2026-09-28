"use client";

import FilterTabs from "@/components/table/common/FilterTabs";
import { useDashboardParams } from "@/hooks/dashboard";
import { DASHBOARD_PERIODS, PERIOD_LABELS } from "@/lib/dashboard";

const LABELS = DASHBOARD_PERIODS.map((period) => PERIOD_LABELS[period]);
const PERIOD_OF = Object.fromEntries(DASHBOARD_PERIODS.map((period) => [PERIOD_LABELS[period], period]));

/**
 * The window the money tiles count. The value is the API's enum, kept in the
 * URL; the tabs show its label.
 */
export default function DateFilterRow() {
  const { period, setPeriod } = useDashboardParams();

  return (
    <div className="flex items-center justify-between px-4 w-full">
      <FilterTabs
        options={LABELS}
        value={PERIOD_LABELS[period]}
        onValueChange={(label) => PERIOD_OF[label] && setPeriod(PERIOD_OF[label])}
      />
    </div>
  );
}
