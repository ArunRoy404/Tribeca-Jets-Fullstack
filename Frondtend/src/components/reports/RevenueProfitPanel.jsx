"use client";

import { useReportsStore } from "@/store/useReportsStore";
import ChartPanel from "./ChartPanel";
import RevenueProfitChart from "./charts/RevenueProfitChart";

export default function RevenueProfitPanel() {
  const range = useReportsStore((s) => s.revenueChartRange);
  const data = useReportsStore((s) => s.getRevenueChartData());
  const setRange = useReportsStore((s) => s.setRevenueChartRange);

  return (
    <ChartPanel title={`REVENUE & PROFIT BY ${range.toUpperCase().replace("LY", "")}`} range={range} onRangeChange={setRange}>
      <RevenueProfitChart data={data} />
    </ChartPanel>
  );
}
