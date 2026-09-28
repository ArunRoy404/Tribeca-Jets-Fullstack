"use client";

import Link from "next/link";
import { DollarSign, Pencil, RotateCcw, Trash2 } from "lucide-react";
import DetailSheet from "@/components/common/DetailSheet";
import DetailField from "@/components/common/DetailField";
import SectionCard from "@/components/common/SectionCard";
import StatusBadge from "@/components/common/StatusBadge";
import PaymentLedger from "@/components/common/payments/PaymentLedger";
import TableStatus from "@/components/table/common/TableStatus";
import { Button } from "@/components/ui/button";
import {
  useOperatorPayable,
  useOperatorPaymentsTableParams,
  useRemoveOperatorPayable,
  useRestoreOperatorPayable,
  useRestoreOperatorPayment,
  useWithdrawOperatorPayment,
} from "@/hooks/operator-payments";
import { usePermissions } from "@/hooks/common/usePermissions";
import { Permission } from "@/lib/permissions";
import { formatPayableStatus, toPayableRow } from "@/lib/operatorPayment";
import { useOperatorPaymentsStore } from "@/store/useOperatorPaymentsStore";

const LABEL = "text-[14px]";

/**
 * One operator bill, opened from the URL (`?bill=<id>`): what the operator
 * billed, the figures the API computed from it, and the payment ledger — live
 * payments and withdrawn ones, with who withdrew them. Nothing is summed here.
 */
export default function OperatorPaymentDetailSheet() {
  const params = useOperatorPaymentsTableParams();
  const id = params.bill || null;
  const { data, isPending, error, refetch } = useOperatorPayable(id);
  const item = data ? toPayableRow(data) : null;

  const { canWrite } = usePermissions();
  const mayWrite = canWrite(Permission.MANAGE_OPERATOR_PAYMENTS);

  const openEditModal = useOperatorPaymentsStore((s) => s.openEditModal);
  const openPaymentModal = useOperatorPaymentsStore((s) => s.openPaymentModal);

  const { mutate: remove } = useRemoveOperatorPayable();
  const { mutate: restore } = useRestoreOperatorPayable();
  const { mutate: withdrawPayment, isPending: withdrawing } = useWithdrawOperatorPayment();
  const { mutate: restorePayment } = useRestoreOperatorPayment();

  const close = () => params.setBill("");
  const live = item && !item.isArchived;
  const open = live && item.rawStatus === "OPEN";

  return (
    <DetailSheet open={Boolean(id)} onOpenChange={(next) => !next && close()} resetKey={id}>
      {!item ? (
        <TableStatus isLoading={isPending} error={error} onRetry={refetch} />
      ) : (
        <>
          <div className="border-b border-secondary flex items-start justify-between pb-4 w-full">
            <div className="flex flex-col gap-2 items-start">
              <div className="flex flex-wrap gap-2 items-center">
                <p className="font-montserrat font-bold text-[20px] text-foreground">{item.operator}</p>
                <StatusBadge status={item.state} bordered />
                {item.isArchived && <StatusBadge status="Archived" />}
              </div>
              <p className="font-montserrat text-[12px] text-muted-foreground">
                {item.number} · {item.tripReference}
              </p>
            </div>
          </div>

          <SectionCard>
            <div className="flex gap-4 w-full">
              <DetailField
                label="OPERATOR"
                value={
                  item.operatorId ? (
                    <Link href={`/dashboard/operators/${item.operatorId}`} className="text-purple hover:underline">
                      {item.operator}
                    </Link>
                  ) : (
                    item.operator
                  )
                }
                labelClassName={LABEL}
              />
              <DetailField
                label="TRIP"
                value={
                  item.tripId ? (
                    <Link href={`/dashboard/trips/${item.tripId}`} className="text-purple hover:underline">
                      {item.tripReference}
                    </Link>
                  ) : (
                    item.tripReference
                  )
                }
                labelClassName={LABEL}
              />
            </div>
            <div className="flex gap-4 w-full">
              <DetailField label="BILLED" value={item.total} valueClassName="text-foreground" labelClassName={LABEL} />
              <DetailField label="PAID" value={item.paid} valueClassName="text-success" labelClassName={LABEL} />
            </div>
            <div className="flex gap-4 w-full">
              <DetailField
                label="BALANCE"
                value={item.balance}
                valueClassName={item.hasBalance ? "text-destructive" : "text-foreground"}
                labelClassName={LABEL}
              />
              <DetailField label="DUE DATE" value={item.due} labelClassName={LABEL} />
            </div>
            <div className="flex gap-4 w-full">
              <DetailField label="THEIR INVOICE" value={item.operatorReference ?? "—"} labelClassName={LABEL} />
              <DetailField label="THEIR TERMS" value={item.paymentTerms ?? "—"} labelClassName={LABEL} />
            </div>
            <div className="flex gap-4 w-full">
              <DetailField label="CLIENT" value={item.client} labelClassName={LABEL} />
              <DetailField label="BROKER" value={item.broker} labelClassName={LABEL} />
            </div>
            <div className="flex gap-4 w-full">
              <DetailField label="TRIP DATE" value={item.tripDate} labelClassName={LABEL} />
              <DetailField label="STATUS" value={formatPayableStatus(item.rawStatus)} labelClassName={LABEL} />
            </div>
          </SectionCard>

          <PaymentLedger
            payments={data?.payments ?? []}
            withdrawn={data?.withdrawnPayments ?? []}
            emptyText="Nothing sent to the operator yet."
            mayCorrect={live && mayWrite}
            mayWithdraw={live && mayWrite}
            mayRestore={open && mayWrite}
            withdrawing={withdrawing}
            onCorrect={(payment) => openPaymentModal(data, payment)}
            onWithdraw={(payment, done) =>
              withdrawPayment({ payableId: item.id, paymentId: payment.id }, { onSuccess: done })
            }
            onRestore={(payment) => restorePayment({ payableId: item.id, paymentId: payment.id })}
          />

          <SectionCard title="Notes" titleClassName="text-foreground">
            <p className="font-montserrat text-[14px] text-muted-foreground w-full whitespace-pre-line">
              {item.notes || "No notes."}
            </p>
          </SectionCard>

          {mayWrite && (
            <div className="border-t border-secondary flex flex-wrap items-center justify-between gap-3 pt-4 w-full mt-auto">
              {item.isArchived ? (
                <Button variant="outline" className="gap-2 px-4" onClick={() => restore(item.id)}>
                  <RotateCcw className="size-4" />
                  Restore
                </Button>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    {open && item.hasBalance && (
                      <Button variant="success" className="gap-2 px-4" onClick={() => openPaymentModal(data)}>
                        <DollarSign className="size-4" />
                        Pay Operator
                      </Button>
                    )}
                    <Button variant="outline" className="gap-2 px-4" onClick={() => openEditModal(data)}>
                      <Pencil className="size-4" />
                      Edit
                    </Button>
                  </div>
                  {item.paymentCount === 0 && (
                    <Button variant="destructive" className="gap-2 px-4" onClick={() => remove(item.id, { onSuccess: close })}>
                      <Trash2 className="size-4" />
                      Archive
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}
    </DetailSheet>
  );
}
