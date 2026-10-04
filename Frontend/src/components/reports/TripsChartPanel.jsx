"use client";

import { useMemo } from "react";
import { useReportSeries, useReportsParams } from "@/hooks/reports";
import { SERIES_BUCKET_NOUNS, toChartPoints } from "@/lib/reports";
import ChartPanel from "./ChartPanel";
import TripsLineChart from "./charts/TripsLineChart";

/** Booked and flown trips per bucket, by departure date. */
export default function TripsChartPanel() {
  const { tripsBy, setTripsBy, anchor } = useReportsParams();
  const query = useReportSeries({ bucket: tripsBy, on: anchor });
  const data = useMemo(() => toChartPoints(query.data), [query.data]);

  return (
    <ChartPanel title={`Trips By ${SERIES_BUCKET_NOUNS[tripsBy]}`} bucket={tripsBy} onBucketChange={setTripsBy} query={query}>
      <TripsLineChart data={data} />
    </ChartPanel>
  );
}
