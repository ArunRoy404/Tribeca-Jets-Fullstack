"use client";

import { useMemo } from "react";
import { useReportBrokers, useReportsParams } from "@/hooks/reports";
import { toBrokerRows } from "@/lib/reports";
import RankingPanel from "./RankingPanel";

const columns = [
  { key: "broker", label: "Broker", align: "left" },
  { key: "revenue", label: "Revenue", align: "right", cellClassName: () => "text-success" },
  { key: "profit", label: "Profit", align: "right", cellClassName: () => "text-purple" },
  { key: "trips", label: "Trips", align: "right" },
  { key: "margin", label: "Margin", align: "right" },
];

export default function BrokerPerformancePanel() {
  const { window } = useReportsParams();
  const query = useReportBrokers(window);
  const rows = useMemo(() => toBrokerRows(query.data?.data), [query.data]);
  return (
    <RankingPanel title="Broker Performance" query={query} rows={rows} columns={columns} emptyMessage="No trips in this period." />
  );
}
