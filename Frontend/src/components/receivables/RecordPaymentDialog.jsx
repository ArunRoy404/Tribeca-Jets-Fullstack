"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import PaymentForm from "@/components/common/payments/PaymentForm";
import { useRecordPayment, useUpdatePayment } from "@/hooks/receivables";
import { toReceivableRow } from "@/lib/receivable";
import { useReceivablesStore } from "@/store/useReceivablesStore";

/**
 * Record money received against an invoice, or correct a payment already
 * recorded. The form is the shared `PaymentForm`; this dialog supplies the
 * invoice's summary and the receivables hooks. The API refuses a payment past
 * what is still owed and says how much that is.
 */
export default function RecordPaymentDialog() {
  const open = useReceivablesStore((s) => s.paymentModalOpen);
  const invoice = useReceivablesStore((s) => s.paymentInvoice);
  const payment = useReceivablesStore((s) => s.editingPayment);
  const close = useReceivablesStore((s) => s.closePaymentModal);

  const { mutate: record, isPending: recording } = useRecordPayment();
  const { mutate: correct, isPending: correcting } = useUpdatePayment();

  const row = invoice ? toReceivableRow(invoice) : null;

  const submit = (payload, { onError }) => {
    if (payment) correct({ ...payload, invoiceId: invoice.id, paymentId: payment.id }, { onSuccess: close, onError });
    else record({ ...payload, invoiceId: invoice.id }, { onSuccess: close, onError });
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent className="sm:max-w-2xl rounded-2xl p-6 gap-4 max-h-[90vh] overflow-y-auto">
        {open && row && (
          <PaymentForm
            key={payment?.id ?? invoice.id}
            title={payment ? "Correct Payment" : "Record Payment"}
            summary={[
              { label: "Invoice", value: row.number, tone: "purple" },
              { label: "Billed to", value: row.client },
              { label: "Invoice total", value: row.total },
              { label: "Paid so far", value: row.paid, tone: "success" },
              { label: "Balance", value: row.balance, tone: row.hasBalance ? "destructive" : "foreground" },
            ]}
            balance={invoice.balance}
            payment={payment}
            amountLabel="Amount received, USD"
            dateLabel="Received on (Optional — today if blank)"
            pending={recording || correcting}
            onSubmit={submit}
            onCancel={close}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
