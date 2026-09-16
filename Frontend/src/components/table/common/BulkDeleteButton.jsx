"use client";

import { Trash2, RotateCcw } from "lucide-react";
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
 *
 * `action` switches it between the live tab's Remove and the Archived tab's
 * Restore. It defaults to "remove", so existing callers are untouched.
 *
 * @param action `"remove" | "restore"`
 */
export default function BulkDeleteButton({
  count = 0,
  itemLabel = "items",
  onClick,
  disabled,
  action = "remove",
}) {
  if (!count) return null;

  const restoring = action === "restore";
  const Icon = restoring ? RotateCcw : Trash2;
  const noun = count === 1 ? itemLabel.replace(/s$/, "") : itemLabel;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className={
        restoring
          ? "px-3 sm:px-4 gap-2 border-purple/40 text-purple hover:bg-purple/10 hover:text-purple"
          : "px-3 sm:px-4 gap-2 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
      }
    >
      <Icon className="size-3.5" />
      <span>
        {restoring ? "Restore" : "Remove"} {count} {noun}
      </span>
    </Button>
  );
}
