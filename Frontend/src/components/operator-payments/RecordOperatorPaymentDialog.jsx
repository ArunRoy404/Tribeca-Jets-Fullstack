"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import PaymentForm from "@/components/common/payments/PaymentForm";
import { useRecordOperatorPayment, useUpdateOperatorPayment } from "@/hooks/operator-payments";
import { toPayableRow } from "@/lib/operatorPayment";
import { useOperatorPaymentsStore } from "@/store/useOperatorPaymentsStore";

/**
 * Record money sent to an operator against their bill, or correct a payment
 * already recorded — the shared `PaymentForm` with the bill's summary. The API
 * refuses a payment past what the bill still owes.
 */
export default function RecordOperatorPaymentDialog() {
  const open = useOperatorPaymentsStore((s) => s.paymentModalOpen);
  const bill = useOperatorPaymentsStore((s) => s.paymentBill);
  const payment = useOperatorPaymentsStore((s) => s.editingPayment);
  const close = useOperatorPaymentsStore((s) => s.closePaymentModal);

  const { mutate: record, isPending: recording } = useRecordOperatorPayment();
  const { mutate: correct, isPending: correcting } = useUpdateOperatorPayment();

  const row = bill ? toPayableRow(bill) : null;

  const submit = (payload, { onError }) => {
    if (payment) correct({ ...payload, payableId: bill.id, paymentId: payment.id }, { onSuccess: close, onError });
    else record({ ...payload, payableId: bill.id }, { onSuccess: close, onError });
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent className="sm:max-w-2xl rounded-2xl p-6 gap-4 max-h-[90vh] overflow-y-auto">
        {open && row && (
          <PaymentForm
            key={payment?.id ?? bill.id}
            title={payment ? "Correct Payment" : "Pay Operator"}
            summary={[
              { label: "Bill", value: row.operatorReference ? `${row.number} · their ref ${row.operatorReference}` : row.number, tone: "purple" },
              { label: "Operator", value: row.operator },
              { label: "Billed", value: row.total },
              { label: "Paid so far", value: row.paid, tone: "success" },
              { label: "Balance", value: row.balance, tone: row.hasBalance ? "destructive" : "foreground" },
            ]}
            balance={bill.balance}
            payment={payment}
            amountLabel="Amount sent, USD"
            dateLabel="Sent on (Optional — today if blank)"
            pending={recording || correcting}
            onSubmit={submit}
            onCancel={close}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
