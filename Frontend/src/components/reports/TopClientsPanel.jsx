"use client";

import { useMemo } from "react";
import { useReportClients, useReportsParams } from "@/hooks/reports";
import { toClientRows } from "@/lib/reports";
import RankingPanel from "./RankingPanel";

const columns = [
  { key: "client", label: "Client", align: "left" },
  { key: "trips", label: "Trips", align: "right" },
  { key: "revenue", label: "Revenue", align: "right", cellClassName: () => "text-success" },
  { key: "profit", label: "Profit", align: "right", cellClassName: () => "text-purple" },
];

export default function TopClientsPanel() {
  const { window } = useReportsParams();
  const query = useReportClients(window);
  const rows = useMemo(() => toClientRows(query.data?.data), [query.data]);
  return (
    <RankingPanel title="Top Clients by Revenue" query={query} rows={rows} columns={columns} emptyMessage="No trips in this period." />
  );
}
