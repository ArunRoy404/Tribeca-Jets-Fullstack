"use client";

import { useReportsStore } from "@/store/useReportsStore";
import DarkPanel from "@/components/common/DarkPanel";
import ReportTable from "./ReportTable";

const columns = [
  { key: "broker", label: "Broker", align: "left" },
  {
    key: "revenue",
    label: "Revenue",
    align: "right",
    cellClassName: () => "text-success",
    render: (row) => `$${row.revenue.toLocaleString()}`,
  },
  {
    key: "profit",
    label: "Profit",
    align: "right",
    cellClassName: () => "text-purple",
    render: (row) => `$${row.profit.toLocaleString()}`,
  },
  { key: "trips", label: "Trips", align: "right" },
  { key: "margin", label: "Margin", align: "right" },
];

export default function BrokerPerformancePanel() {
  const data = useReportsStore((s) => s.brokerPerformance);
  return (
    <DarkPanel title="Broker Performance">
      <ReportTable columns={columns} rows={data} rowKey={(row, i) => `${row.broker}-${i}`} />
    </DarkPanel>
  );
}
