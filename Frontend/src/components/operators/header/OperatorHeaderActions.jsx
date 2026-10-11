"use client";

import { Edit, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/common/usePermissions";
import { Action, Module } from "@/lib/access";
import { Permission } from "@/lib/permissions";

/**
 * Only what this person may do: Edit with Operators · Edit, Restore with
 * Operators · Archive, and Request Quote with Operator Sourcing's own check
 * (still the old matrix until its review) — never for a suspended operator,
 * which is "do not book until further notice".
 */
export default function OperatorHeaderActions({ operator, onEdit, onRequestQuote, onRestore }) {
  const { canAccess, canWrite } = usePermissions();
  if (!operator) return null;

  const mayEdit = canAccess(Module.OPERATORS, Action.EDIT);
  const mayArchive = canAccess(Module.OPERATORS, Action.ARCHIVE);
  const mayRequestQuote = canWrite(Permission.MANAGE_TRIPS) && !operator.isSuspended;

  if (operator.isArchived) {
    return mayArchive ? (
      <div className="flex items-center gap-2.5 shrink-0">
        <Button
          className="h-9 sm:h-10 text-[12px] sm:text-[13px] gap-2 font-medium cursor-pointer"
          onClick={() => onRestore?.(operator)}
        >
          <RotateCcw className="size-4" />
          Restore Operator
        </Button>
      </div>
    ) : null;
  }

  if (!mayEdit && !mayRequestQuote) return null;

  return (
    <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 flex-wrap">
      {mayEdit ? (
        <Button
          variant="outline"
          className="h-9 sm:h-10 text-[12px] sm:text-[13px] gap-2 font-medium bg-white border-border shadow-xs hover:bg-muted/40 cursor-pointer"
          onClick={() => onEdit?.(operator)}
        >
          <Edit className="size-3.5 sm:size-4 text-muted-foreground" />
          Edit
        </Button>
      ) : null}

      {mayRequestQuote ? (
        <Button
          className="h-9 sm:h-10 text-[12px] sm:text-[13px] gap-2 font-medium shadow-button cursor-pointer"
          onClick={() => onRequestQuote?.(operator)}
        >
          <Plus className="size-3.5 sm:size-4" />
          Request Quote
        </Button>
      ) : null}
    </div>
  );
}
