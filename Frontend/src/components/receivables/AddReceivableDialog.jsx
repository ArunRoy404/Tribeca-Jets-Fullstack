"use client";

import { useMemo, useState } from "react";
import { Edit, Plus, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import CommonInput from "@/components/common/CommonInput";
import CommonSelect from "@/components/common/CommonSelect";
import DatePicker from "@/components/common/DatePicker";
import FormField from "@/components/trips/FormField";
import { useCreateReceivable, useUpdateReceivable } from "@/hooks/receivables";
import { useTrip, useTrips } from "@/hooks/trips";
import { useClients } from "@/hooks/clients";
import { INVOICE_STATUSES, formatInvoiceStatus } from "@/lib/receivable";
import { displayName } from "@/lib/client";
import { formatTripReference, formatTripRoute } from "@/lib/trip";
import { formatMoneyExact } from "@/lib/money";
import { optionalNumber, optionalText } from "@/lib/form";
import { toDateInput } from "@/lib/date";
import { useReceivablesStore } from "@/store/useReceivablesStore";

/** "Billed to" left on the trip's own client. */
const TRIP_CLIENT = "__trip_client__";

const statusOptions = (editing) =>
  (editing ? INVOICE_STATUSES : ["DRAFT", "SENT"]).map((value) => ({ value, label: formatInvoiceStatus(value) }));

function initialForm(invoice, draft) {
  return {
    tripId: invoice?.tripId ?? draft?.tripId ?? "",
    clientId: invoice ? invoice.clientId : TRIP_CLIENT,
    amount: invoice?.amount ?? "",
    fetAmount: invoice?.fetAmount ?? "",
    status: invoice?.status ?? "DRAFT",
    issuedAt: toDateInput(invoice?.issuedAt),
    dueDate: toDateInput(invoice?.dueDate),
    notes: invoice?.notes ?? "",
  };
}

/**
 * Raise or edit a client invoice on a trip.
 *
 * The invoice number is assigned by the API on save. The charge and its FET
 * are what the client is billed — typed, or copied in one click from the
 * trip's own computed figures ("Bill the full trip"), never pre-filled. The
 * total, paid and balance are worked out by the API and read back on the
 * detail sheet; nothing here adds money up.
 */
export default function AddReceivableDialog() {
  const open = useReceivablesStore((s) => s.invoiceModalOpen);
  const editing = useReceivablesStore((s) => s.editingInvoice);
  const draft = useReceivablesStore((s) => s.draft);
  const close = useReceivablesStore((s) => s.closeInvoiceModal);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent className="sm:max-w-3xl rounded-2xl p-6 gap-4 max-h-[90vh] overflow-y-auto">
        {open && <InvoiceForm key={editing?.id ?? "new"} invoice={editing} draft={draft} onDone={close} />}
      </DialogContent>
    </Dialog>
  );
}

function InvoiceForm({ invoice, draft, onDone }) {
  const editing = Boolean(invoice);
  const [form, setForm] = useState(() => initialForm(invoice, draft));
  const [errors, setErrors] = useState({});
  const set = (field) => (value) => setForm((prev) => ({ ...prev, [field]: value }));

  const { data: trips } = useTrips({ limit: 100, sortBy: "departureDate", sortOrder: "desc" }, { enabled: !editing });
  const { data: clients } = useClients({ limit: 100 });

  // A trip handed over from its own page may sit outside the picker's first
  // page; it is fetched on its own so the picker can still name it.
  const listed = (trips?.data ?? []).some((t) => t.id === form.tripId);
  const { data: handedOver } = useTrip(!editing && form.tripId && trips && !listed ? form.tripId : null);
  const tripRows = useMemo(
    () => [...(handedOver ? [handedOver] : []), ...(trips?.data ?? [])],
    [handedOver, trips?.data],
  );
  const tripOptions = useMemo(
    () =>
      tripRows.map((t) => ({
        value: t.id,
        label: `${formatTripReference(t.reference)} · ${t.client ? displayName(t.client) : "—"} · ${formatTripRoute(t)}`,
      })),
    [tripRows],
  );
  const trip = tripRows.find((t) => t.id === form.tripId) ?? null;
  const billing = trip?.clientPayment ?? null;
  const fullCharge = billing?.fullCharge ?? null;

  const clientOptions = [
    { value: TRIP_CLIENT, label: trip?.client ? `The trip's client (${displayName(trip.client)})` : "The trip's client" },
    ...(clients?.data ?? []).map((c) => ({ value: c.id, label: displayName(c) })),
  ];

  const { mutate: create, isPending: creating } = useCreateReceivable();
  const { mutate: update, isPending: updating } = useUpdateReceivable();

  const billFullTrip = () =>
    setForm((prev) => ({ ...prev, amount: String(fullCharge.amount), fetAmount: String(fullCharge.fetAmount) }));

  const handleSubmit = (event) => {
    event.preventDefault();
    const next = {};
    if (!editing && !form.tripId) next.tripId = "Choose the trip";
    if (!String(form.amount).trim()) next.amount = "Enter the amount billed";
    setErrors(next);
    if (Object.keys(next).length) return;

    const clear = { editing };
    const payload = {
      ...(editing ? {} : { tripId: form.tripId }),
      ...(form.clientId && form.clientId !== TRIP_CLIENT ? { clientId: form.clientId } : {}),
      amount: optionalNumber(form.amount),
      // A blank FET box is no FET — zero, not "leave what was there".
      fetAmount: optionalNumber(form.fetAmount) ?? 0,
      status: form.status,
      issuedAt: form.status === "SENT" && form.issuedAt ? form.issuedAt : undefined,
      dueDate: form.dueDate || (editing ? null : undefined),
      notes: optionalText(form.notes, clear),
    };

    const onError = (error) => setErrors(error?.fieldErrors ?? {});
    if (editing) update({ id: invoice.id, ...payload }, { onSuccess: onDone, onError });
    else create(payload, { onSuccess: onDone, onError });
  };

  return (
    <>
      <div className="border-b border-secondary pb-4 w-full flex flex-col gap-1">
        <DialogTitle className="font-montserrat font-bold text-[20px] text-foreground leading-none">
          {editing ? `Edit ${invoice.number}` : "Add Receivable"}
        </DialogTitle>
        {!editing && (
          <p className="font-montserrat text-[12px] text-muted-foreground">The invoice number is assigned when it is saved.</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          <FormField label="Trip" error={errors.tripId}>
            {editing ? (
              <p className="font-montserrat font-semibold text-[14px] text-purple py-2">
                {invoice?.trip?.reference ? formatTripReference(invoice.trip.reference) : "—"}
              </p>
            ) : (
              <CommonSelect value={form.tripId} onChange={set("tripId")} options={tripOptions} placeholder="Choose the trip" />
            )}
          </FormField>
          <FormField label="Billed to" error={errors.clientId}>
            <CommonSelect value={form.clientId} onChange={set("clientId")} options={clientOptions} />
          </FormField>
        </div>

        {!editing && trip && (
          <div className="rounded-sm border border-border bg-secondary/30 p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5 font-montserrat text-[12px]">
              <span className="text-muted-foreground">
                Trip total{" "}
                <span className="font-semibold text-foreground">
                  {trip.totalPrice === null || trip.totalPrice === undefined ? "not priced yet" : formatMoneyExact(trip.totalPrice)}
                </span>
              </span>
              {billing?.invoiceCount > 0 && (
                <span className="text-muted-foreground">
                  Already invoiced <span className="font-semibold text-foreground">{formatMoneyExact(billing.invoiced)}</span>
                  {" · "}paid <span className="font-semibold text-success">{formatMoneyExact(billing.paid)}</span>
                </span>
              )}
            </div>
            {fullCharge && (
              <Button type="button" variant="outline" size="sm" onClick={billFullTrip}>
                Bill the full trip
              </Button>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          <FormField label="Amount, USD (before FET)" error={errors.amount}>
            <CommonInput
              type="number"
              min="0.01"
              step="0.01"
              value={form.amount}
              onChange={(e) => set("amount")(e.target.value)}
              placeholder="e.g. 60000"
            />
          </FormField>
          <FormField label="FET, USD (Optional)" error={errors.fetAmount}>
            <CommonInput
              type="number"
              min="0"
              step="0.01"
              value={form.fetAmount}
              onChange={(e) => set("fetAmount")(e.target.value)}
              placeholder="0 if none is charged"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
          <FormField label="Status" error={errors.status}>
            <CommonSelect value={form.status} onChange={set("status")} options={statusOptions(editing)} />
          </FormField>
          <FormField label="Due date (Optional)" error={errors.dueDate}>
            <DatePicker value={form.dueDate} onChange={set("dueDate")} placeholder="Choose Date" />
          </FormField>
          {form.status === "SENT" && (
            <FormField label="Sent on (Optional — today if blank)" error={errors.issuedAt}>
              <DatePicker value={form.issuedAt} onChange={set("issuedAt")} placeholder="Today" />
            </FormField>
          )}
        </div>

        <FormField label="Notes (Optional)" error={errors.notes}>
          <CommonInput
            type="textarea"
            rows={3}
            value={form.notes}
            onChange={(e) => set("notes")(e.target.value)}
            placeholder="Payment terms, a promised wire..."
          />
        </FormField>

        <div className="border-t border-secondary flex gap-2 justify-end items-center pt-4 w-full">
          <Button type="button" variant="outline" className="gap-2 px-4" onClick={onDone}>
            <X className="size-4" />
            Cancel
          </Button>
          <Button type="submit" disabled={creating || updating} className="gap-2 px-4">
            {editing ? <Edit className="size-4" /> : <Plus className="size-4" />}
            {editing ? "Save Changes" : "Add Receivable"}
          </Button>
        </div>
      </form>
    </>
  );
}
