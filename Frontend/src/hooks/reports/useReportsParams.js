"use client";

import { useMemo } from "react";
import { useTableQueryParams } from "@/hooks/common/useTableQueryParams";
import {
  DEFAULT_REPORT_PERIOD,
  DEFAULT_SERIES_BUCKET,
  REPORT_PERIODS,
  SERIES_BUCKETS,
  isReportRange,
  reportWindow,
} from "@/lib/reports";

const oneOf = (allowed) => (raw) => (allowed.includes(raw) ? raw : undefined);

const SCHEMA = {
  /** A period tab, around the desk's today. */
  period: { default: DEFAULT_REPORT_PERIOD, parse: oneOf(REPORT_PERIODS) },
  /** A picked month, quarter or YTD — wins over `period` while it is set. */
  range: { default: "", parse: (raw) => (isReportRange(raw) ? raw : undefined) },
  /** Each chart's own bucket. */
  revenueBy: { default: DEFAULT_SERIES_BUCKET, parse: oneOf(SERIES_BUCKETS) },
  tripsBy: { default: DEFAULT_SERIES_BUCKET, parse: oneOf(SERIES_BUCKETS) },
};

/**
 * URL state for Reports: the window and each chart's bucket, so a reload or
 * a shared link reopens the same report. Picking a tab clears the picked
 * range and picking a range clears nothing — the range simply wins — so the
 * two can never describe different windows at once.
 */
export function useReportsParams() {
  const { values, setters, setValues } = useTableQueryParams(SCHEMA);

  return useMemo(() => {
    const window = reportWindow(values);
    return {
      period: values.range ? null : values.period,
      range: values.range || null,
      window,
      /** The day the charts are anchored on: the window's last day. */
      anchor: window.to,
      revenueBy: values.revenueBy,
      tripsBy: values.tripsBy,
      setPeriod: (period) => setValues({ period, range: "" }),
      setRange: (range) => setValues({ range }),
      setRevenueBy: setters.setRevenueBy,
      setTripsBy: setters.setTripsBy,
    };
  }, [values, setters, setValues]);
}
