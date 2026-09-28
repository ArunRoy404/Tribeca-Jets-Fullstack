"use client";

import Link from "next/link";
import { DollarSign, Pencil, RotateCcw, Send, Trash2 } from "lucide-react";
import DetailSheet from "@/components/common/DetailSheet";
import DetailField from "@/components/common/DetailField";
import SectionCard from "@/components/common/SectionCard";
import StatusBadge from "@/components/common/StatusBadge";
import PaymentLedger from "@/components/common/payments/PaymentLedger";
import TableStatus from "@/components/table/common/TableStatus";
import { Button } from "@/components/ui/button";
import {
  useReceivable,
  useReceivablesTableParams,
  useRemoveReceivable,
  useRestorePayment,
  useRestoreReceivable,
  useUpdateReceivable,
  useWithdrawPayment,
} from "@/hooks/receivables";
import { usePermissions } from "@/hooks/common/usePermissions";
import { Permission, Scope } from "@/lib/permissions";
import { formatInvoiceStatus, toReceivableRow } from "@/lib/receivable";
import { useReceivablesStore } from "@/store/useReceivablesStore";

const LABEL = "text-[14px]";

/**
 * One invoice, opened from the URL (`?invoice=<id>`): the billing, the figures
 * the API computed from it, and the payment ledger — live payments and the
 * ones withdrawn, with who withdrew them. Nothing is summed here.
 */
export default function ReceivableDetailSheet() {
  const params = useReceivablesTableParams();
  const id = params.invoice || null;
  const { data, isPending, error, refetch } = useReceivable(id);
  const item = data ? toReceivableRow(data) : null;

  const { canWrite, scopeFor } = usePermissions();
  const mayWrite = canWrite(Permission.MANAGE_RECEIVABLES);
  const mayArchive = scopeFor(Permission.MANAGE_RECEIVABLES) === Scope.ALL;

  const openEditModal = useReceivablesStore((s) => s.openEditModal);
  const openPaymentModal = useReceivablesStore((s) => s.openPaymentModal);

  const { mutate: update, isPending: sending } = useUpdateReceivable();
  const { mutate: remove } = useRemoveReceivable();
  const { mutate: restore } = useRestoreReceivable();
  const { mutate: withdrawPayment, isPending: withdrawing } = useWithdrawPayment();
  const { mutate: restorePayment } = useRestorePayment();

  const close = () => params.setInvoice("");
  const live = item && !item.isArchived;
  const mayTouchPayments = live && mayWrite && item.rawStatus === "SENT";

  return (
    <DetailSheet open={Boolean(id)} onOpenChange={(open) => !open && close()} resetKey={id}>
      {!item ? (
        <TableStatus isLoading={isPending} error={error} onRetry={refetch} />
      ) : (
        <>
          <div className="border-b border-secondary flex items-start justify-between pb-4 w-full">
            <div className="flex flex-col gap-2 items-start">
              <div className="flex flex-wrap gap-2 items-center">
                <p className="font-montserrat font-bold text-[20px] text-foreground">{item.client}</p>
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
              <DetailField label="BILLED TO" value={item.client} labelClassName={LABEL} />
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
              <DetailField label="AMOUNT" value={item.amount} labelClassName={LABEL} />
              <DetailField label="FET" value={item.fet} labelClassName={LABEL} />
            </div>
            <div className="flex gap-4 w-full">
              <DetailField label="TOTAL" value={item.total} valueClassName="text-foreground" labelClassName={LABEL} />
              <DetailField label="PAID" value={item.paid} valueClassName="text-success" labelClassName={LABEL} />
            </div>
            <div className="flex gap-4 w-full">
              <DetailField
                label="BALANCE"
                value={item.balance}
                valueClassName={item.hasBalance ? "text-destructive" : "text-foreground"}
                labelClassName={LABEL}
              />
              <DetailField label="STATUS" value={formatInvoiceStatus(item.rawStatus)} labelClassName={LABEL} />
            </div>
            <div className="flex gap-4 w-full">
              <DetailField label="SENT ON" value={item.issued} labelClassName={LABEL} />
              <DetailField label="DUE DATE" value={item.due} labelClassName={LABEL} />
            </div>
            <div className="flex gap-4 w-full">
              <DetailField label="BROKER" value={item.broker} labelClassName={LABEL} />
              <DetailField label="TRIP DATE" value={item.tripDate} labelClassName={LABEL} />
            </div>
          </SectionCard>

          <PaymentLedger
            payments={data?.payments ?? []}
            withdrawn={data?.withdrawnPayments ?? []}
            emptyText={
              item.rawStatus === "DRAFT" ? "No payments. Mark the invoice as sent to record one." : "No payments recorded yet."
            }
            mayCorrect={live && mayWrite}
            mayWithdraw={live && mayArchive}
            mayRestore={mayTouchPayments && mayArchive}
            withdrawing={withdrawing}
            onCorrect={(payment) => openPaymentModal(data, payment)}
            onWithdraw={(payment, done) =>
              withdrawPayment({ invoiceId: item.id, paymentId: payment.id }, { onSuccess: done })
            }
            onRestore={(payment) => restorePayment({ invoiceId: item.id, paymentId: payment.id })}
          />

          <SectionCard title="Notes" titleClassName="text-foreground">
            <p className="font-montserrat text-[14px] text-muted-foreground w-full whitespace-pre-line">
              {item.notes || "No notes."}
            </p>
          </SectionCard>

          {(mayWrite || mayArchive) && (
            <div className="border-t border-secondary flex flex-wrap items-center justify-between gap-3 pt-4 w-full mt-auto">
              {item.isArchived ? (
                mayArchive && (
                  <Button variant="outline" className="gap-2 px-4" onClick={() => restore(item.id)}>
                    <RotateCcw className="size-4" />
                    Restore
                  </Button>
                )
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    {mayTouchPayments && item.hasBalance && (
                      <Button variant="success" className="gap-2 px-4" onClick={() => openPaymentModal(data)}>
                        <DollarSign className="size-4" />
                        Record Payment
                      </Button>
                    )}
                    {mayWrite && item.rawStatus === "DRAFT" && (
                      <Button
                        variant="outline"
                        disabled={sending}
                        className="gap-2 px-4"
                        onClick={() => update({ id: item.id, status: "SENT" })}
                      >
                        <Send className="size-4" />
                        Mark Sent
                      </Button>
                    )}
                    {mayWrite && (
                      <Button variant="outline" className="gap-2 px-4" onClick={() => openEditModal(data)}>
                        <Pencil className="size-4" />
                        Edit
                      </Button>
                    )}
                  </div>
                  {mayArchive && item.paymentCount === 0 && (
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
