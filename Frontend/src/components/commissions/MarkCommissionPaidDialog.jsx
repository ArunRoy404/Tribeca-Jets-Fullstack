"use client";

import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import PaymentForm from "@/components/common/payments/PaymentForm";
import ConfirmCommissionPaidDialog from "./ConfirmCommissionPaidDialog";
import { useCommissionsStore } from "@/store/useCommissionsStore";
import { useUpdateCommission } from "@/hooks/commissions";
import { formatMoneyExact } from "@/lib/money";

export default function MarkCommissionPaidDialog() {
  const commission = useCommissionsStore((s) => s.payingCommission);
  const close = useCommissionsStore((s) => s.closePayModal);
  return <Dialog open={Boolean(commission)} onOpenChange={(open) => !open && close()}>
    <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto p-6">
      {commission && <PaidForm key={commission.id} commission={commission} onDone={close} />}
    </DialogContent>
  </Dialog>;
}

function PaidForm({ commission, onDone }) {
  const [payment, setPayment] = useState(null);
  const update = useUpdateCommission();
  const confirm = async () => {
    try {
      await update.mutateAsync({ id: commission.id, status: "PAID", ...payment });
      onDone();
    } catch { setPayment(null); }
  };
  return <>
    <PaymentForm title={`Mark COM-${commission.reference} paid`} showAmount={false} showNotes={false}
      referenceMaxLength={120} summary={[{ label: "Commission", value: commission.value == null ? "Not yet known" : formatMoneyExact(commission.value) }]}
      pending={update.isPending} submitLabel="Review Payment" onCancel={onDone}
      onSubmit={({ reference, ...values }) => setPayment({ ...values, paymentReference: reference ?? null })} />
    <ConfirmCommissionPaidDialog commission={commission} payment={payment} pending={update.isPending}
      onOpenChange={(open) => !open && setPayment(null)} onConfirm={confirm} />
  </>;
}
