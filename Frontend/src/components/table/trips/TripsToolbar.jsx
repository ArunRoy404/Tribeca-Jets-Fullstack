import Link from "next/link";
import { Download, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import SearchInput from "@/components/table/common/SearchInput";
import FilterDropdown from "@/components/table/common/FilterDropdown";
import { tripStatusOptions, tripBrokerOptions, tripPaymentOptions } from "@/dummyData/trips";

export default function TripsToolbar({
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  brokerFilter,
  setBrokerFilter,
  paymentFilter,
  setPaymentFilter,
  onExport,
}) {
  return (
    <div className="relative flex flex-wrap items-center justify-between gap-3 p-4 w-full bg-sidebar border-b border-border">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          size="sm"
          value={search ?? ""}
          onChange={(e) => setSearch?.(e.target.value)}
          placeholder="Search..."
        />
        <FilterDropdown label="All Status" value={statusFilter} options={tripStatusOptions} onChange={setStatusFilter} />
        <FilterDropdown label="All Brokers" value={brokerFilter} options={tripBrokerOptions} onChange={setBrokerFilter} />
        <FilterDropdown label="All Payments" value={paymentFilter} options={tripPaymentOptions} onChange={setPaymentFilter} />
      </div>
      <div className="flex gap-3 items-center">
        <Button variant="outline" size="sm" className="px-3 sm:px-4 gap-2" onClick={() => onExport?.()}>
          <Download className="size-3.5" />
          Export
        </Button>
        <Button variant="outline" size="sm" className="px-3 sm:px-4 gap-2" render={<Link href="/dashboard/trips/new" />}>
          <Plus className="size-3.5" />
          New Trip
        </Button>
      </div>
    </div>
  );
}
