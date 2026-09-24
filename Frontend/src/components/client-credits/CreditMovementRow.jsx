"use client";

import { Button } from "@/components/ui/button";
import CreditMovementForm from "@/components/client-credits/CreditMovementForm";
import { formatMoneyExact } from "@/lib/money";
import { getFullName } from "@/lib/user";
import { cn } from "@/lib/utils";

const DASH = "—";

/** The day the money moved, read as text — `new Date("2026-03-14")` is UTC. */
function movementDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? ""));
  if (!match) return DASH;
  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString(
    undefined,
    { year: "numeric", month: "short", day: "numeric" },
  );
}

/**
 * One movement on the ledger.
 *
 * The amount is signed **for reading only** — `+$18,000.00` and `−$12,000.00`.
 * The stored amount is always positive and `type` carries the direction; a
 * ledger that showed both the same way would make a client's account
 * unreadable at a glance, which is the one thing it exists to be.
 */
export default function CreditMovementRow({
  movement,
  canWrite,
  isEditing,
  isSaving,
  onEdit,
  onCancelEdit,
  onSave,
  onRemove,
  onRestore,
}) {
  const isCredit = movement?.type === "CREDIT";
  const withdrawn = Boolean(movement?.deletedAt);

  if (isEditing) {
    return (
      <div className="py-4">
        <CreditMovementForm
          initial={movement}
          submitLabel="Save"
          isPending={isSaving}
          onCancel={onCancelEdit}
          onSubmit={onSave}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-start justify-between gap-3 py-3.5">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span
            className={cn(
              "font-montserrat font-bold text-[14px] sm:text-[15px]",
              withdrawn
                ? "text-muted-foreground line-through decoration-border"
                : isCredit
                  ? "text-success"
                  : "text-foreground",
            )}
          >
            {isCredit ? "+" : "−"}
            {formatMoneyExact(movement?.amount)}
          </span>

          <span className="rounded-sm bg-secondary px-1.5 py-0.5 font-montserrat text-[10px] font-semibold text-muted-foreground">
            {isCredit ? "On account" : "Used towards a trip"}
          </span>

          {withdrawn && (
            <span className="rounded-sm bg-muted px-1.5 py-0.5 font-montserrat text-[10px] font-semibold text-muted-foreground">
              Withdrawn
            </span>
          )}
        </div>

        <span className="font-montserrat text-[12px] text-muted-foreground">
          {movementDate(movement?.occurredAt)}
          {movement?.reference ? ` · ${movement.reference}` : ""}
        </span>

        {/* An honest blank, never a stand-in sentence. */}
        {movement?.reason && (
          <p className="whitespace-pre-line font-montserrat text-[12px] leading-relaxed text-foreground">
            {movement.reason}
          </p>
        )}

        {withdrawn && movement?.deletedBy && (
          <span className="font-montserrat text-[11px] text-muted-foreground">
            Withdrawn by {getFullName(movement.deletedBy) || "the system"}
          </span>
        )}
      </div>

      {canWrite && (
        <div className="flex items-center gap-1">
          {withdrawn ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 font-montserrat text-[11px] text-muted-foreground"
              onClick={onRestore}
            >
              Restore
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 font-montserrat text-[11px] text-muted-foreground"
                onClick={onEdit}
              >
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 font-montserrat text-[11px] text-muted-foreground"
                onClick={onRemove}
              >
                Withdraw
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
