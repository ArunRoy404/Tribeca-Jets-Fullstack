"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import SearchInput from "@/components/table/common/SearchInput";

export default function ItinerariesToolbar({
  search,
  setSearch,
  onBuildItinerary,
}) {
  return (
    <div className="relative flex flex-wrap items-center justify-between gap-3 p-4 w-full bg-sidebar border-b border-border">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          size="sm"
          placeholder="Search itineraries..."
          value={search ?? ""}
          onChange={(e) => setSearch?.(e.target.value)}
        />
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onBuildItinerary?.()}
        className="px-3 sm:px-4 gap-2"
      >
        <Plus className="size-3.5" />
        <span>Build Itinerary</span>
      </Button>
    </div>
  );
}
