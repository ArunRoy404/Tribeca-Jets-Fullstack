"use client";

import { useMemo, useState } from "react";
import CommonSelect from "@/components/common/CommonSelect";
import { useTrips } from "@/hooks/trips";
import { toTripRow } from "@/lib/trip";
import { Button } from "@/components/ui/button";
import CommonInput from "@/components/common/CommonInput";
import { CommonDatePicker } from "@/components/common/DatePicker";
import { cn } from "@/lib/utils";

/** Today, as the wire format — never `toISOString()`, which is UTC. */
function todayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

/**
 * One movement on or off a client's account — new, or editing an existing one.
 *
 * The direction is a pair of buttons rather than a dropdown because there are
 * exactly two and they are opposites: a select hides one of them behind a
 * click, and "which way does this money go" is the single most important thing
 * on the form.
 *
 * **Nothing here is pre-filled with a plausible number.** `amount` opens empty
 * and `occurredAt` opens on today, which is a fact rather than a guess — a
 * defaulted amount is how an operator ends up with a reliability rating nobody
 * assigned.
 */
export default function CreditMovementForm({
  initial,
  clientId,
  submitLabel = "Record movement",
  onSubmit,
  onCancel,
  isPending = false,
  className,
}) {
  const [type, setType] = useState(initial?.type ?? "CREDIT");
  const [amount, setAmount] = useState(
    initial?.amount === undefined || initial?.amount === null
      ? ""
      : String(initial.amount),
  );
  const [occurredAt, setOccurredAt] = useState(
    initial?.occurredAt ? String(initial.occurredAt).slice(0, 10) : todayIso(),
  );
  const [reason, setReason] = useState(initial?.reason ?? "");
  const [reference, setReference] = useState(initial?.reference ?? "");
  // "Used towards another trip" as a real link (Trips, #11) — this client's
  // own trips only, the same rule the API enforces.
  const [tripId, setTripId] = useState(initial?.appliedToTripId ?? "");
  const owner = clientId ?? initial?.clientId;
  const { data: trips } = useTrips({ clientId: owner, limit: 100 }, { enabled: Boolean(owner) && type === "APPLICATION" });
  const tripOptions = useMemo(
    () =>
      (trips?.data ?? []).map((trip) => {
        const row = toTripRow(trip);
        return { value: trip.id, label: `${row.reference} · ${row.route} · ${row.departure}` };
      }),
    [trips?.data],
  );

  // Mirrors the API exactly: positive, at most two decimals. A form that
  // promises one contract while the server enforces another is a form that
  // fails on submit for reasons the person cannot see.
  const numeric = Number(amount);
  const hasAmount = amount.trim() !== "" && Number.isFinite(numeric);
  const decimals = amount.split(".")[1]?.length ?? 0;
  const amountError =
    !hasAmount || numeric <= 0
      ? amount.trim() === ""
        ? null
        : "Enter an amount greater than zero"
      : decimals > 2
        ? "Amounts are in whole cents — at most two decimal places"
        : null;

  const canSave =
    hasAmount && numeric > 0 && !amountError && Boolean(occurredAt) && !isPending;

  const submit = (event) => {
    event.preventDefault();
    if (!canSave) return;
    onSubmit?.({
      type,
      amount: numeric,
      occurredAt,
      // Trimmed to nothing means "not given", never an empty string — the API
      // refuses a blank reason and would reject the whole movement for it.
      reason: reason.trim() || undefined,
      reference: reference.trim() || undefined,
      // Only an application links a trip. On an edit, turning it back into a
      // credit — or clearing the picker — sends null so the link is removed.
      appliedToTripId:
        type === "APPLICATION" && tripId
          ? tripId
          : initial?.appliedToTripId
            ? null
            : undefined,
    });
  };

  return (
    <form onSubmit={submit} className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-col gap-2">
        <span className="font-montserrat text-[12px] font-medium text-muted-foreground">
          Direction
        </span>
        <div className="flex flex-wrap gap-2">
          {[
            { id: "CREDIT", label: "Money on account" },
            { id: "APPLICATION", label: "Used towards a trip" },
          ].map((option) => (
            <Button
              key={option.id}
              type="button"
              size="sm"
              variant={type === option.id ? "default" : "outline"}
              onClick={() => setType(option.id)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CommonInput
          label="Amount"
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          required
          placeholder="18000.00"
          value={amount}
          error={amountError}
          onChange={(event) => setAmount(event.target.value)}
        />

        <div className="flex w-full flex-col gap-2">
          <span className="font-montserrat text-base font-medium text-foreground">
            Date the money moved
          </span>
          <CommonDatePicker value={occurredAt} onChange={setOccurredAt} />
        </div>
      </div>

      {type === "APPLICATION" && (
        <div className="flex w-full flex-col gap-2">
          <span className="font-montserrat text-base font-medium text-foreground">Trip it was used towards (Optional)</span>
          <CommonSelect
            value={tripId}
            onChange={setTripId}
            placeholder={tripOptions.length ? "Select one of this client's trips" : "No trips for this client yet"}
            options={tripOptions}
          />
        </div>
      )}

      <CommonInput
        label="Reason (Optional)"
        name="reason"
        type="textarea"
        rows={2}
        placeholder={
          type === "CREDIT"
            ? "Cancelled KTEB→KMIA, kept on account"
            : "Applied to the Aspen trip"
        }
        value={reason}
        onChange={(event) => setReason(event.target.value)}
      />

      <CommonInput
        label="Reference (Optional)"
        name="reference"
        placeholder="REF-44812"
        value={reference}
        onChange={(event) => setReference(event.target.value)}
      />

      {amountError && (
        <p className="font-montserrat text-[12px] text-destructive">{amountError}</p>
      )}

      <div className="flex items-center justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" size="sm" disabled={!canSave}>
          {isPending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
