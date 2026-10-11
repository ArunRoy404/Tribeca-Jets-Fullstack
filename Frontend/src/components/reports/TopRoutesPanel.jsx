"use client";

import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { useReportRoutes, useReportsParams } from "@/hooks/reports";
import { toRouteRows } from "@/lib/reports";
import RankingPanel from "./RankingPanel";

const columns = [
  {
    key: "route",
    label: "Route",
    align: "left",
    render: (row) => (
      <span className="inline-flex items-center gap-1.5 font-semibold text-[12px] text-ink">
        {row?.from}
        <ArrowRight className="size-3.5 text-muted-foreground" />
        {row?.to}
      </span>
    ),
  },
  { key: "trips", label: "Trips", align: "right" },
  { key: "revenue", label: "Revenue", align: "right", cellClassName: () => "text-success" },
];

export default function TopRoutesPanel() {
  const { window } = useReportsParams();
  const query = useReportRoutes(window);
  const rows = useMemo(() => toRouteRows(query.data?.data), [query.data]);
  return <RankingPanel title="Top Routes" query={query} rows={rows} columns={columns} emptyMessage="No trips in this period." />;
}
