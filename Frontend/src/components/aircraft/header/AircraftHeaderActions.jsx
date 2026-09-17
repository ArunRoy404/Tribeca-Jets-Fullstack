"use client";

import { Edit, SlidersHorizontal, Trash2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AircraftHeaderActions({
  aircraft,
  onEdit,
  onChangeStatus,
  onArchive,
  onRestore,
  mayWrite = true,
}) {
  if (!aircraft || !mayWrite) return null;

  if (aircraft.isArchived) {
    return (
      <div className="flex items-center gap-2.5 shrink-0">
        <Button
          className="bg-[#252832] hover:bg-[#252832]/90 text-white h-9 sm:h-10 text-[12px] sm:text-[13px] gap-2 font-medium cursor-pointer"
          onClick={() => onRestore?.(aircraft)}
        >
          <RotateCcw className="size-4" />
          Restore Aircraft
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 flex-wrap">
      <Button
        variant="outline"
        className="h-9 sm:h-10 text-[12px] sm:text-[13px] gap-2 font-medium bg-white border-border shadow-xs hover:bg-muted/40 cursor-pointer"
        onClick={() => onEdit?.(aircraft)}
      >
        <Edit className="size-3.5 sm:size-4 text-muted-foreground" />
        Edit
      </Button>

      <Button
        className="bg-[#252832] hover:bg-[#252832]/90 text-white h-9 sm:h-10 text-[12px] sm:text-[13px] gap-2 font-medium shadow-button cursor-pointer"
        onClick={() => onChangeStatus?.(aircraft)}
      >
        <SlidersHorizontal className="size-3.5 sm:size-4" />
        Change Status
      </Button>

      <Button
        variant="outline"
        className="h-9 sm:h-10 text-[12px] sm:text-[13px] gap-2 font-medium text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive cursor-pointer"
        onClick={() => onArchive?.(aircraft)}
      >
        <Trash2 className="size-3.5 sm:size-4" />
        Remove
      </Button>
    </div>
  );
}
