"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * "Remove N selected", shown beside a table's primary action.
 *
 * Renders nothing at all when the selection is empty rather than sitting there
 * disabled: a permanently greyed-out button is noise, and its appearing is the
 * clearest signal that selecting rows did something.
 *
 * Shared because every table in the app has the same checkbox column — see the
 * reuse rule in the root `AGENTS.md`.
 */
export default function BulkDeleteButton({ count = 0, itemLabel = "items", onClick, disabled }) {
  if (!count) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className="px-3 sm:px-4 gap-2 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
    >
      <Trash2 className="size-3.5" />
      <span>
        Remove {count} {count === 1 ? itemLabel.replace(/s$/, "") : itemLabel}
      </span>
    </Button>
  );
}
