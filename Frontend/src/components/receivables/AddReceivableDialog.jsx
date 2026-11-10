"use client";

import { useState } from "react";
import { Edit, Plus, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import CommonInput from "@/components/common/CommonInput";
import CommonSelect from "@/components/common/CommonSelect";
import DatePicker from "@/components/common/DatePicker";
import FormField from "@/components/trips/FormField";
import { useCreateReceivable, useUpdateReceivable } from "@/hooks/receivables";
import { useTrip } from "@/hooks/trips";
import TripPicker from "@/components/trips/TripPicker";
import ClientPicker from "@/components/clients/ClientPicker";
import { INVOICE_STATUSES, formatInvoiceStatus } from "@/lib/receivable";
import { displayName } from "@/lib/client";
import { formatTripReference } from "@/lib/trip";
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
    wireInstructions: invoice?.wireInstructions ?? "",
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

  // Trips and clients come from paged, searched pickers — no 100-row cap.
  // The chosen trip is read on its own for its client and what is billable,
  // whether it was picked here or handed over from its own page.
  const { data: tripRecord } = useTrip(!editing && form.tripId ? form.tripId : null);
  const trip = tripRecord ?? null;
  const billing = trip?.clientPayment ?? null;
  const fullCharge = billing?.fullCharge ?? null;
  const tripClientLabel = trip?.client ? `The trip's client (${displayName(trip.client)})` : "The trip's client";

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
      wireInstructions: optionalText(form.wireInstructions, clear),
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
              <TripPicker
                value={form.tripId}
                onChange={(id) => set("tripId")(id || "")}
                placeholder="Choose the trip"
                invalid={Boolean(errors.tripId)}
              />
            )}
          </FormField>
          <FormField label="Billed to" error={errors.clientId}>
            <ClientPicker
              value={form.clientId === TRIP_CLIENT ? "" : form.clientId}
              onChange={(id) => set("clientId")(id || TRIP_CLIENT)}
              placeholder={tripClientLabel}
              allowClear
              clearLabel={tripClientLabel}
            />
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
            {billing?.invoiceCount > 0 && trip.totalPrice && billing.invoiced >= trip.totalPrice && (
              <span className="font-montserrat text-[12px] font-medium text-emerald-500">Trip fully invoiced</span>
            )}
            {fullCharge && (
              <Button type="button" variant="outline" size="sm" onClick={billFullTrip}>
                {billing?.invoiceCount > 0 ? "Bill remaining balance" : "Bill the full trip"}
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

        <div
          className={`grid grid-cols-1 ${
            form.status === "SENT" ? "sm:grid-cols-3" : "sm:grid-cols-2"
          } gap-4 w-full`}
        >
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
            rows={2}
            value={form.notes}
            onChange={(e) => set("notes")(e.target.value)}
            placeholder="Payment terms, a promised wire..."
          />
        </FormField>

        <FormField label="Custom Wire Instructions (Optional)" error={errors.wireInstructions}>
          <CommonInput
            type="textarea"
            rows={2}
            value={form.wireInstructions}
            onChange={(e) => set("wireInstructions")(e.target.value)}
            placeholder="Leave blank to use default company wire instructions from Settings, or enter custom bank details..."
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
