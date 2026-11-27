"use client";

import ConfirmDialog from "@/components/common/ConfirmDialog";
import { formatPaymentMethod } from "@/lib/payment";
import { formatMoneyExact } from "@/lib/money";

export default function ConfirmCommissionPaidDialog({ commission, payment, pending, onConfirm, onOpenChange }) {
  const changesTerms = ["basis", "percentage", "amount", "finalAmount", "tripId"].some(
    (key) => payment?.[key] !== undefined && payment[key] !== commission?.[key],
  );
  const value = payment?.finalAmount ?? (payment?.basis !== "PERCENT_OF_PROFIT" ? payment?.amount : null)
    ?? (changesTerms ? null : commission?.value);
  return <ConfirmDialog open={Boolean(payment)} onOpenChange={onOpenChange} pending={pending}
    title={commission?.reference ? `Mark commission COM-${commission.reference} paid?` : "Record this commission as paid?"}
    description={`${value == null ? "Amount not yet known" : formatMoneyExact(value)} by ${formatPaymentMethod(payment?.method)}${payment?.paymentReference ? ` · ${payment.paymentReference}` : ""}. This records the payout.`}
    confirmLabel="Mark Paid" onConfirm={onConfirm} />;
}
