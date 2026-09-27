"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import CommonInput from "@/components/common/CommonInput";
import CommonSelect from "@/components/common/CommonSelect";
import DatePicker from "@/components/common/DatePicker";
import FormField from "@/components/trips/FormField";
import { useRecordPayment, useUpdatePayment } from "@/hooks/receivables";
import { PAYMENT_METHODS, formatPaymentMethod } from "@/lib/payment";
import { toReceivableRow } from "@/lib/receivable";
import { optionalNumber, optionalText } from "@/lib/form";
import { toDateInput } from "@/lib/date";
import { useReceivablesStore } from "@/store/useReceivablesStore";

const methodOptions = PAYMENT_METHODS.map((value) => ({ value, label: formatPaymentMethod(value) }));

function Line({ label, value, valueClassName = "text-foreground" }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-montserrat text-[14px] text-muted-foreground">{label}</span>
      <span className={`font-montserrat font-bold text-[14px] ${valueClassName}`}>{value}</span>
    </div>
  );
}

/**
 * Record money received against an invoice, or correct a payment already
 * recorded. The API refuses a payment past what is still owed and says how
 * much that is; the form shows the balance the API computed and offers it in
 * one click, but never pre-fills an amount nobody typed.
 */
export default function RecordPaymentDialog() {
  const open = useReceivablesStore((s) => s.paymentModalOpen);
  const invoice = useReceivablesStore((s) => s.paymentInvoice);
  const payment = useReceivablesStore((s) => s.editingPayment);
  const close = useReceivablesStore((s) => s.closePaymentModal);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent className="sm:max-w-2xl rounded-2xl p-6 gap-4 max-h-[90vh] overflow-y-auto">
        {open && invoice && (
          <PaymentForm key={payment?.id ?? invoice.id} invoice={invoice} payment={payment} onDone={close} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function PaymentForm({ invoice, payment, onDone }) {
  const editing = Boolean(payment);
  const row = toReceivableRow(invoice);
  const [form, setForm] = useState(() => ({
    amount: payment?.amount ?? "",
    paidAt: toDateInput(payment?.paidAt),
    method: payment?.method ?? "",
    reference: payment?.reference ?? "",
    notes: payment?.notes ?? "",
  }));
  const [errors, setErrors] = useState({});
  const set = (field) => (value) => setForm((prev) => ({ ...prev, [field]: value }));

  const { mutate: record, isPending: recording } = useRecordPayment();
  const { mutate: correct, isPending: correcting } = useUpdatePayment();

  const handleSubmit = (event) => {
    event.preventDefault();
    const next = {};
    if (!String(form.amount).trim()) next.amount = "Enter the amount received";
    if (!form.method) next.method = "Choose how it was paid";
    setErrors(next);
    if (Object.keys(next).length) return;

    const clear = { editing };
    const payload = {
      invoiceId: invoice.id,
      amount: optionalNumber(form.amount),
      paidAt: form.paidAt || undefined,
      method: form.method,
      reference: optionalText(form.reference, clear),
      notes: optionalText(form.notes, clear),
    };

    const onError = (error) => setErrors(error?.fieldErrors ?? {});
    if (editing) correct({ ...payload, paymentId: payment.id }, { onSuccess: onDone, onError });
    else record(payload, { onSuccess: onDone, onError });
  };

  return (
    <>
      <div className="border-b border-secondary pb-4 w-full">
        <DialogTitle className="font-montserrat font-bold text-[20px] text-foreground leading-none">
          {editing ? "Correct Payment" : "Record Payment"}
        </DialogTitle>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
        <div className="bg-secondary/30 rounded-sm p-4 flex flex-col gap-3 border border-border">
          <Line label="Invoice" value={row.number} valueClassName="text-purple" />
          <Line label="Billed to" value={row.client} />
          <Line label="Invoice total" value={row.total} />
          <Line label="Paid so far" value={row.paid} valueClassName="text-success" />
          <Line label="Balance" value={row.balance} valueClassName={row.hasBalance ? "text-destructive" : "text-foreground"} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          <FormField label="Amount received, USD" error={errors.amount}>
            <div className="flex flex-col gap-1.5">
              <CommonInput
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={(e) => set("amount")(e.target.value)}
                placeholder="e.g. 20000"
              />
              {!editing && row.hasBalance && (
                <button
                  type="button"
                  className="self-start font-montserrat text-[12px] font-semibold text-purple hover:underline"
                  onClick={() => set("amount")(String(invoice.balance))}
                >
                  Pay the full balance ({row.balance})
                </button>
              )}
            </div>
          </FormField>
          <FormField label="Received on (Optional — today if blank)" error={errors.paidAt}>
            <DatePicker value={form.paidAt} onChange={set("paidAt")} placeholder="Today" />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          <FormField label="Method" error={errors.method}>
            <CommonSelect value={form.method} onChange={set("method")} options={methodOptions} placeholder="How it was paid" />
          </FormField>
          <FormField label="Reference (Optional)" error={errors.reference}>
            <CommonInput
              value={form.reference}
              onChange={(e) => set("reference")(e.target.value)}
              placeholder="Wire confirmation, cheque number"
            />
          </FormField>
        </div>

        <FormField label="Notes (Optional)" error={errors.notes}>
          <CommonInput type="textarea" rows={2} value={form.notes} onChange={(e) => set("notes")(e.target.value)} />
        </FormField>

        <div className="border-t border-secondary flex gap-2 justify-end items-center pt-4 w-full">
          <Button type="button" variant="outline" className="gap-2 px-4" onClick={onDone}>
            <X className="size-4" />
            Cancel
          </Button>
          <Button type="submit" variant="success" disabled={recording || correcting} className="gap-2 px-4">
            <Check className="size-4" />
            {editing ? "Save Correction" : "Record Payment"}
          </Button>
        </div>
      </form>
    </>
  );
}
