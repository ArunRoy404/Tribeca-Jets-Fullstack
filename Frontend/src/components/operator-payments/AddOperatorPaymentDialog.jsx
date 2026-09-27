"use client";

import { useMemo, useState } from "react";
import { Edit, Plus, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import CommonInput from "@/components/common/CommonInput";
import CommonSelect from "@/components/common/CommonSelect";
import DatePicker from "@/components/common/DatePicker";
import FormField from "@/components/trips/FormField";
import { useCreateOperatorPayable, useUpdateOperatorPayable } from "@/hooks/operator-payments";
import { useTrip, useTrips } from "@/hooks/trips";
import { useOperators } from "@/hooks/operators";
import { PAYABLE_STATUSES, formatPayableStatus } from "@/lib/operatorPayment";
import { displayName } from "@/lib/client";
import { formatTripReference, formatTripRoute } from "@/lib/trip";
import { formatMoneyExact } from "@/lib/money";
import { optionalNumber, optionalText } from "@/lib/form";
import { toDateInput } from "@/lib/date";
import { useOperatorPaymentsStore } from "@/store/useOperatorPaymentsStore";

/** "Billed by" left on the trip's own operator. */
const TRIP_OPERATOR = "__trip_operator__";

function initialForm(bill, draft) {
  return {
    tripId: bill?.tripId ?? draft?.tripId ?? "",
    operatorId: bill ? bill.operatorId : TRIP_OPERATOR,
    amount: bill?.amount ?? "",
    status: bill?.status ?? "OPEN",
    dueDate: toDateInput(bill?.dueDate),
    operatorReference: bill?.operatorReference ?? "",
    notes: bill?.notes ?? "",
  };
}

/**
 * Record or edit an operator's bill on a trip.
 *
 * The bill number is assigned by the API. The amount is what the operator
 * billed — typed, or copied in one click from the trip's own operator cost
 * ("Use the trip's operator cost"), never pre-filled. Paid and balance are the
 * API's, read back on the detail sheet.
 */
export default function AddOperatorPaymentDialog() {
  const open = useOperatorPaymentsStore((s) => s.billModalOpen);
  const editing = useOperatorPaymentsStore((s) => s.editingBill);
  const draft = useOperatorPaymentsStore((s) => s.draft);
  const close = useOperatorPaymentsStore((s) => s.closeBillModal);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent className="sm:max-w-3xl rounded-2xl p-6 gap-4 max-h-[90vh] overflow-y-auto">
        {open && <BillForm key={editing?.id ?? "new"} bill={editing} draft={draft} onDone={close} />}
      </DialogContent>
    </Dialog>
  );
}

function BillForm({ bill, draft, onDone }) {
  const editing = Boolean(bill);
  const [form, setForm] = useState(() => initialForm(bill, draft));
  const [errors, setErrors] = useState({});
  const set = (field) => (value) => setForm((prev) => ({ ...prev, [field]: value }));

  const { data: trips } = useTrips({ limit: 100, sortBy: "departureDate", sortOrder: "desc" }, { enabled: !editing });
  const { data: operators } = useOperators({ limit: 100, sortBy: "name", sortOrder: "asc" });

  // A trip handed over from its own page may sit outside the picker's first
  // page; it is fetched on its own so the picker can still name it.
  const listed = (trips?.data ?? []).some((t) => t.id === form.tripId);
  const { data: handedOver } = useTrip(!editing && form.tripId && trips && !listed ? form.tripId : null);
  const tripRows = useMemo(
    () => [...(handedOver ? [handedOver] : []), ...(trips?.data ?? [])],
    [handedOver, trips?.data],
  );
  const tripOptions = tripRows.map((t) => ({
    value: t.id,
    label: `${formatTripReference(t.reference)} · ${t.client ? displayName(t.client) : "—"} · ${formatTripRoute(t)}`,
  }));
  const trip = tripRows.find((t) => t.id === form.tripId) ?? null;
  const owed = trip?.operatorPayment ?? null;
  // Present only for a role with VIEW_FINANCIALS — and only such roles can
  // record bills — so the button never offers a figure the caller cannot see.
  const operatorCost = trip?.operatorCost ?? null;

  const operatorOptions = [
    { value: TRIP_OPERATOR, label: trip?.operator?.name ? `The trip's operator (${trip.operator.name})` : "The trip's operator" },
    ...(operators?.data ?? []).map((o) => ({ value: o.id, label: o.name })),
  ];

  const { mutate: create, isPending: creating } = useCreateOperatorPayable();
  const { mutate: update, isPending: updating } = useUpdateOperatorPayable();

  const handleSubmit = (event) => {
    event.preventDefault();
    const next = {};
    if (!editing && !form.tripId) next.tripId = "Choose the trip";
    if (!editing && form.operatorId === TRIP_OPERATOR && trip && !trip.operatorId) {
      next.operatorId = "This trip has no operator yet — choose who billed it";
    }
    if (!String(form.amount).trim()) next.amount = "Enter what the operator billed";
    setErrors(next);
    if (Object.keys(next).length) return;

    const clear = { editing };
    const payload = {
      ...(editing ? {} : { tripId: form.tripId }),
      ...(form.operatorId && form.operatorId !== TRIP_OPERATOR ? { operatorId: form.operatorId } : {}),
      amount: optionalNumber(form.amount),
      ...(editing ? { status: form.status } : {}),
      dueDate: form.dueDate || (editing ? null : undefined),
      operatorReference: optionalText(form.operatorReference, clear),
      notes: optionalText(form.notes, clear),
    };

    const onError = (error) => setErrors(error?.fieldErrors ?? {});
    if (editing) update({ id: bill.id, ...payload }, { onSuccess: onDone, onError });
    else create(payload, { onSuccess: onDone, onError });
  };

  return (
    <>
      <div className="border-b border-secondary pb-4 w-full flex flex-col gap-1">
        <DialogTitle className="font-montserrat font-bold text-[20px] text-foreground leading-none">
          {editing ? `Edit ${bill.number}` : "Add Operator Bill"}
        </DialogTitle>
        {!editing && (
          <p className="font-montserrat text-[12px] text-muted-foreground">The bill number is assigned when it is saved.</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          <FormField label="Trip" error={errors.tripId}>
            {editing ? (
              <p className="font-montserrat font-semibold text-[14px] text-purple py-2">
                {bill?.trip?.reference ? formatTripReference(bill.trip.reference) : "—"}
              </p>
            ) : (
              <CommonSelect value={form.tripId} onChange={set("tripId")} options={tripOptions} placeholder="Choose the trip" />
            )}
          </FormField>
          <FormField label="Billed by" error={errors.operatorId}>
            <CommonSelect value={form.operatorId} onChange={set("operatorId")} options={operatorOptions} />
          </FormField>
        </div>

        {!editing && trip && (
          <div className="rounded-sm border border-border bg-secondary/30 p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5 font-montserrat text-[12px]">
              <span className="text-muted-foreground">
                Trip&apos;s operator cost{" "}
                <span className="font-semibold text-foreground">
                  {operatorCost === null ? "not entered yet" : formatMoneyExact(operatorCost)}
                </span>
              </span>
              {owed?.payableCount > 0 && (
                <span className="text-muted-foreground">
                  Already recorded <span className="font-semibold text-foreground">{formatMoneyExact(owed.owed)}</span>
                  {" · "}paid <span className="font-semibold text-success">{formatMoneyExact(owed.paid)}</span>
                </span>
              )}
            </div>
            {operatorCost !== null && (
              <Button type="button" variant="outline" size="sm" onClick={() => set("amount")(String(operatorCost))}>
                Use the trip&apos;s operator cost
              </Button>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          <FormField label="Amount billed, USD" error={errors.amount}>
            <CommonInput
              type="number"
              min="0.01"
              step="0.01"
              value={form.amount}
              onChange={(e) => set("amount")(e.target.value)}
              placeholder="e.g. 48000"
            />
          </FormField>
          <FormField label="Their invoice number (Optional)" error={errors.operatorReference}>
            <CommonInput
              value={form.operatorReference}
              onChange={(e) => set("operatorReference")(e.target.value)}
              placeholder="As printed on their bill"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          <FormField label="Due date (Optional)" error={errors.dueDate}>
            <DatePicker value={form.dueDate} onChange={set("dueDate")} placeholder="Choose Date" />
          </FormField>
          {editing && (
            <FormField label="Status" error={errors.status}>
              <CommonSelect
                value={form.status}
                onChange={set("status")}
                options={PAYABLE_STATUSES.map((value) => ({ value, label: formatPayableStatus(value) }))}
              />
            </FormField>
          )}
        </div>

        <FormField label="Notes (Optional)" error={errors.notes}>
          <CommonInput
            type="textarea"
            rows={3}
            value={form.notes}
            onChange={(e) => set("notes")(e.target.value)}
            placeholder="Their terms, what the bill covers..."
          />
        </FormField>

        <div className="border-t border-secondary flex gap-2 justify-end items-center pt-4 w-full">
          <Button type="button" variant="outline" className="gap-2 px-4" onClick={onDone}>
            <X className="size-4" />
            Cancel
          </Button>
          <Button type="submit" disabled={creating || updating} className="gap-2 px-4">
            {editing ? <Edit className="size-4" /> : <Plus className="size-4" />}
            {editing ? "Save Changes" : "Add Operator Bill"}
          </Button>
        </div>
      </form>
    </>
  );
}
