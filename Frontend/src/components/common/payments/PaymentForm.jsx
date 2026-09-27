"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import CommonInput from "@/components/common/CommonInput";
import CommonSelect from "@/components/common/CommonSelect";
import DatePicker from "@/components/common/DatePicker";
import FormField from "@/components/trips/FormField";
import { PAYMENT_METHODS, formatPaymentMethod } from "@/lib/payment";
import { formatMoneyExact } from "@/lib/money";
import { optionalNumber, optionalText } from "@/lib/form";
import { toDateInput } from "@/lib/date";
import { cn } from "@/lib/utils";

const methodOptions = PAYMENT_METHODS.map((value) => ({ value, label: formatPaymentMethod(value) }));

const TONES = {
  purple: "text-purple",
  success: "text-success",
  destructive: "text-destructive",
  foreground: "text-foreground",
};

/**
 * Record or correct one payment against a bill — money in on a client invoice
 * (Receivables) or money out on an operator bill (Operator Payments). The two
 * dialogs differ only in the summary they show and the hook they call, so the
 * form is shared (AGENTS.md, "extract on the second copy").
 *
 * `summary` is `[{ label, value, tone? }]`, already formatted by the caller
 * from the API's figures. `balance` is the API's own balance, offered in one
 * click — never pre-filled. `onSubmit(payload, { onError })` receives the
 * wire payload; a field error from the API is shown under its field.
 */
export default function PaymentForm({
  title,
  summary = [],
  balance,
  payment = null,
  amountLabel = "Amount, USD",
  dateLabel = "Paid on (Optional — today if blank)",
  submitLabel,
  pending = false,
  onSubmit,
  onCancel,
}) {
  const editing = Boolean(payment);
  const [form, setForm] = useState(() => ({
    amount: payment?.amount ?? "",
    paidAt: toDateInput(payment?.paidAt),
    method: payment?.method ?? "",
    reference: payment?.reference ?? "",
    notes: payment?.notes ?? "",
  }));
  const [errors, setErrors] = useState({});
  const set = (field) => (value) => setForm((prev) => ({ ...prev, [field]: value }));
  const hasBalance = Number(balance) > 0;

  const handleSubmit = (event) => {
    event.preventDefault();
    const next = {};
    if (!String(form.amount).trim()) next.amount = "Enter the amount";
    if (!form.method) next.method = "Choose how it was paid";
    setErrors(next);
    if (Object.keys(next).length) return;

    const clear = { editing };
    onSubmit?.(
      {
        amount: optionalNumber(form.amount),
        paidAt: form.paidAt || undefined,
        method: form.method,
        reference: optionalText(form.reference, clear),
        notes: optionalText(form.notes, clear),
      },
      { onError: (error) => setErrors(error?.fieldErrors ?? {}) },
    );
  };

  return (
    <>
      <div className="border-b border-secondary pb-4 w-full">
        <DialogTitle className="font-montserrat font-bold text-[20px] text-foreground leading-none">{title}</DialogTitle>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
        {summary.length > 0 && (
          <div className="bg-secondary/30 rounded-sm p-4 flex flex-col gap-3 border border-border">
            {summary.map((line) => (
              <div key={line.label} className="flex items-center justify-between gap-3">
                <span className="font-montserrat text-[14px] text-muted-foreground">{line.label}</span>
                <span className={cn("font-montserrat font-bold text-[14px]", TONES[line.tone] ?? TONES.foreground)}>
                  {line.value}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          <FormField label={amountLabel} error={errors.amount}>
            <div className="flex flex-col gap-1.5">
              <CommonInput
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={(e) => set("amount")(e.target.value)}
                placeholder="e.g. 20000"
              />
              {!editing && hasBalance && (
                <button
                  type="button"
                  className="self-start font-montserrat text-[12px] font-semibold text-purple hover:underline"
                  onClick={() => set("amount")(String(balance))}
                >
                  Pay the full balance ({formatMoneyExact(balance)})
                </button>
              )}
            </div>
          </FormField>
          <FormField label={dateLabel} error={errors.paidAt}>
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
          <Button type="button" variant="outline" className="gap-2 px-4" onClick={onCancel}>
            <X className="size-4" />
            Cancel
          </Button>
          <Button type="submit" variant="success" disabled={pending} className="gap-2 px-4">
            <Check className="size-4" />
            {submitLabel ?? (editing ? "Save Correction" : "Record Payment")}
          </Button>
        </div>
      </form>
    </>
  );
}
