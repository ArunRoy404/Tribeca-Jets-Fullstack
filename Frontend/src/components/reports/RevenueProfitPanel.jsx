"use client";

import { useMemo } from "react";
import { useReportSeries, useReportsParams } from "@/hooks/reports";
import { SERIES_BUCKET_NOUNS, toChartPoints } from "@/lib/reports";
import ChartPanel from "./ChartPanel";
import RevenueProfitChart from "./charts/RevenueProfitChart";

/** Revenue and profit per bucket, by departure date. */
export default function RevenueProfitPanel() {
  const { revenueBy, setRevenueBy, anchor } = useReportsParams();
  const query = useReportSeries({ bucket: revenueBy, on: anchor });
  const data = useMemo(() => toChartPoints(query.data), [query.data]);

  return (
    <ChartPanel
      title={`REVENUE & PROFIT BY ${SERIES_BUCKET_NOUNS[revenueBy].toUpperCase()}`}
      bucket={revenueBy}
      onBucketChange={setRevenueBy}
      query={query}
    >
      <RevenueProfitChart data={data} />
    </ChartPanel>
  );
}
