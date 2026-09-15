"use client";

import { ArrowRight } from "lucide-react";
import { useReportsStore } from "@/store/useReportsStore";
import DarkPanel from "@/components/common/DarkPanel";
import ReportTable from "./ReportTable";

const columns = [
  {
    key: "route",
    label: "Route",
    align: "left",
    render: (row) => (
      <span className="inline-flex items-center gap-1.5 font-semibold text-[12px] text-ink">
        {row.from}
        <ArrowRight className="size-3.5 text-muted-foreground" />
        {row.to}
      </span>
    ),
  },
  { key: "trips", label: "Trips", align: "right" },
  {
    key: "revenue",
    label: "Revenue",
    align: "right",
    cellClassName: () => "text-success",
    render: (row) => `$${row.revenue.toLocaleString()}`,
  },
];

export default function TopRoutesPanel() {
  const data = useReportsStore((s) => s.topRoutes);
  return (
    <DarkPanel title="Top Routes">
      <ReportTable columns={columns} rows={data} rowKey={(row, i) => `${row.from}-${row.to}-${i}`} />
    </DarkPanel>
  );
}
