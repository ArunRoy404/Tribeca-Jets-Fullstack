"use client";

import { Download, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import SearchInput from "@/components/table/common/SearchInput";
import FilterDropdown from "@/components/table/common/FilterDropdown";
import {
  clientStatusOptions,
  clientTypeOptions,
  clientBrokerOptions,
  clientFollowUpOptions,
} from "@/dummyData/clients";

export default function ClientsToolbar({
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  typeFilter,
  setTypeFilter,
  brokerFilter,
  setBrokerFilter,
  followUpFilter,
  setFollowUpFilter,
  onAddClient,
  onExport,
}) {
  return (
    <div className="relative flex flex-wrap items-center justify-between gap-3 p-4 w-full bg-sidebar border-b border-border">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          size="sm"
          placeholder="Search clients, companies, email..."
          value={search ?? ""}
          onChange={(e) => setSearch?.(e.target.value)}
        />
        <FilterDropdown
          label="All Statuses"
          value={statusFilter}
          options={clientStatusOptions}
          onChange={setStatusFilter}
        />
        <FilterDropdown
          label="All Types"
          value={typeFilter}
          options={clientTypeOptions}
          onChange={setTypeFilter}
        />
        <FilterDropdown
          label="All Brokers"
          value={brokerFilter}
          options={clientBrokerOptions}
          onChange={setBrokerFilter}
        />
        <FilterDropdown
          label="All Follow-ups"
          value={followUpFilter}
          options={clientFollowUpOptions}
          onChange={setFollowUpFilter}
        />
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onExport?.()}
          className="px-3 sm:px-4 gap-2"
        >
          <Download className="size-3.5" />
          <span>Export</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onAddClient?.()}
          className="px-3 sm:px-4 gap-2"
        >
          <Plus className="size-3.5" />
          <span>Add Client</span>
        </Button>
      </div>
    </div>
  );
}
