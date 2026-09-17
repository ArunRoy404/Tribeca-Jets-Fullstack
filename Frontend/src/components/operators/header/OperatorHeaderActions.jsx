"use client";

import { Edit, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OperatorHeaderActions({
  operator,
  onEdit,
  onRequestQuote,
  onRestore,
}) {
  if (!operator) return null;

  if (operator.isArchived) {
    return (
      <div className="flex items-center gap-2.5 shrink-0">
        <Button
          className="bg-[#252832] hover:bg-[#252832]/90 text-white h-9 sm:h-10 text-[12px] sm:text-[13px] gap-2 font-medium cursor-pointer"
          onClick={() => onRestore?.(operator)}
        >
          <RotateCcw className="size-4" />
          Restore Operator
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 flex-wrap">
      <Button
        variant="outline"
        className="h-9 sm:h-10 text-[12px] sm:text-[13px] gap-2 font-medium bg-white border-border shadow-xs hover:bg-muted/40 cursor-pointer"
        onClick={() => onEdit?.(operator)}
      >
        <Edit className="size-3.5 sm:size-4 text-muted-foreground" />
        Edit
      </Button>

      <Button
        className="bg-[#252832] hover:bg-[#252832]/90 text-white h-9 sm:h-10 text-[12px] sm:text-[13px] gap-2 font-medium shadow-button cursor-pointer"
        onClick={() => onRequestQuote?.(operator)}
      >
        <Plus className="size-3.5 sm:size-4" />
        Request Quote
      </Button>
    </div>
  );
}
