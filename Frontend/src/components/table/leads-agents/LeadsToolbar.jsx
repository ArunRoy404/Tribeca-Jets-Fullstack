"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import SearchInput from "@/components/table/common/SearchInput";
import FilterDropdown from "@/components/table/common/FilterDropdown";
import {
  leadStatusOptions,
  leadSourceOptions,
  leadBrokerOptions,
  leadPriorityOptions,
} from "@/dummyData/leadsAgents";

export default function LeadsToolbar({
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  sourceFilter,
  setSourceFilter,
  brokerFilter,
  setBrokerFilter,
  priorityFilter,
  setPriorityFilter,
  onAddLead,
}) {
  return (
    <div className="relative flex flex-wrap items-center justify-between gap-3 p-4 w-full bg-sidebar border-b border-border">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          size="sm"
          placeholder="Search leads, name, route..."
          value={search ?? ""}
          onChange={(e) => setSearch?.(e.target.value)}
        />
        <FilterDropdown
          label="All Status"
          value={statusFilter}
          options={leadStatusOptions}
          onChange={setStatusFilter}
        />
        <FilterDropdown
          label="All Sources"
          value={sourceFilter}
          options={leadSourceOptions}
          onChange={setSourceFilter}
        />
        <FilterDropdown
          label="All Brokers"
          value={brokerFilter}
          options={leadBrokerOptions}
          onChange={setBrokerFilter}
        />
        <FilterDropdown
          label="All Priority"
          value={priorityFilter}
          options={leadPriorityOptions}
          onChange={setPriorityFilter}
        />
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onAddLead?.()}
        className="px-3 sm:px-4 gap-2"
      >
        <Plus className="size-3.5" />
        <span>Add Lead</span>
      </Button>
    </div>
  );
}
