"use client";

import { useReportsStore } from "@/store/useReportsStore";
import DarkPanel from "@/components/common/DarkPanel";
import ReportTable from "./ReportTable";

const columns = [
  { key: "client", label: "Client", align: "left" },
  { key: "trips", label: "Trips", align: "right" },
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
];

export default function TopClientsPanel() {
  const data = useReportsStore((s) => s.topClientsByRevenue);
  return (
    <DarkPanel title="Top Clients by Revenue">
      <ReportTable columns={columns} rows={data} rowKey={(row, i) => `${row.client}-${i}`} />
    </DarkPanel>
  );
}
