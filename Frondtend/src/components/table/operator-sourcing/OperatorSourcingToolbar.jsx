"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import SearchInput from "@/components/table/common/SearchInput";
import FilterDropdown from "@/components/table/common/FilterDropdown";
import { sourcingStatusOptions, sourcingBrokerOptions, sourcingPaymentOptions } from "@/dummyData/operatorSourcing";

export default function OperatorSourcingToolbar({
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  brokerFilter,
  setBrokerFilter,
  paymentFilter,
  setPaymentFilter,
  onNewRequest,
}) {
  return (
    <div className="relative flex flex-wrap items-center justify-between gap-3 p-4 w-full bg-sidebar border-b border-border">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          size="sm"
          placeholder="Search sourcing requests..."
          value={search ?? ""}
          onChange={(e) => setSearch?.(e.target.value)}
        />
        <FilterDropdown label="All Status" value={statusFilter} options={sourcingStatusOptions} onChange={setStatusFilter} />
        <FilterDropdown label="All Brokers" value={brokerFilter} options={sourcingBrokerOptions} onChange={setBrokerFilter} />
        <FilterDropdown label="All Payments" value={paymentFilter} options={sourcingPaymentOptions} onChange={setPaymentFilter} />
      </div>
      <Button variant="outline" size="sm" className="px-3 sm:px-4 gap-2" onClick={() => onNewRequest?.()}>
        <Plus className="size-3.5" />
        New Sourcing Request
      </Button>
    </div>
  );
}
