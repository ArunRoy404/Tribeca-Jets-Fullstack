"use client";

import { useReportsStore } from "@/store/useReportsStore";
import ChartPanel from "./ChartPanel";
import TripsLineChart from "./charts/TripsLineChart";

export default function TripsChartPanel() {
  const range = useReportsStore((s) => s.tripsChartRange);
  const data = useReportsStore((s) => s.getTripsChartData());
  const setRange = useReportsStore((s) => s.setTripsChartRange);

  return (
    <ChartPanel title={`Trips By ${range.replace("ly", "")}`} range={range} onRangeChange={setRange}>
      <TripsLineChart data={data} />
    </ChartPanel>
  );
}
