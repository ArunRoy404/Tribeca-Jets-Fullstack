"use client";

import { useState } from "react";
import Link from "next/link";
import { DollarSign, Pencil, RotateCcw, Send, Trash2, Undo2 } from "lucide-react";
import DetailSheet from "@/components/common/DetailSheet";
import DetailField from "@/components/common/DetailField";
import SectionCard from "@/components/common/SectionCard";
import StatusBadge from "@/components/common/StatusBadge";
import BulkDeleteDialog from "@/components/common/BulkDeleteDialog";
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
import { formatInvoiceStatus, toPaymentRow, toReceivableRow } from "@/lib/receivable";
import { useReceivablesStore } from "@/store/useReceivablesStore";

const LABEL = "text-[14px]";

function PaymentLine({ payment, actions }) {
  return (
    <li className="flex flex-col gap-1.5 rounded-sm border border-border px-3 py-2.5 font-montserrat text-[12px]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-bold text-[14px] text-success">{payment.amount}</span>
        <span className="text-muted-foreground">
          {payment.paidAt} · {payment.method}
        </span>
      </div>
      {(payment.reference || payment.notes) && (
        <p className="text-muted-foreground">
          {[payment.reference && `Ref ${payment.reference}`, payment.notes].filter(Boolean).join(" · ")}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] text-muted-foreground">
          {payment.withdrawnAt
            ? `Withdrawn ${payment.withdrawnAt} by ${payment.withdrawnBy}`
            : `Recorded by ${payment.recordedBy}`}
        </span>
        {actions}
      </div>
    </li>
  );
}

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
  const payments = (data?.payments ?? []).map(toPaymentRow);
  const withdrawn = (data?.withdrawnPayments ?? []).map(toPaymentRow);

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

  const [withdrawTarget, setWithdrawTarget] = useState(null);

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

          <SectionCard title={`Payments (${payments.length})`} titleClassName="text-foreground">
            {payments.length === 0 ? (
              <p className="font-montserrat text-[13px] text-muted-foreground w-full">
                {item.rawStatus === "DRAFT"
                  ? "No payments. Mark the invoice as sent to record one."
                  : "No payments recorded yet."}
              </p>
            ) : (
              <ul className="flex flex-col gap-2 w-full">
                {payments.map((payment) => (
                  <PaymentLine
                    key={payment.id}
                    payment={payment}
                    actions={
                      live && mayWrite ? (
                        <span className="flex gap-1.5">
                          <Button size="sm" variant="outline" onClick={() => openPaymentModal(data, payment.raw)}>
                            Correct
                          </Button>
                          {mayArchive && (
                            <Button size="sm" variant="destructive" onClick={() => setWithdrawTarget(payment)}>
                              Withdraw
                            </Button>
                          )}
                        </span>
                      ) : null
                    }
                  />
                ))}
              </ul>
            )}

            {withdrawn.length > 0 && (
              <details className="w-full">
                <summary className="cursor-pointer font-montserrat text-[12px] font-semibold text-muted-foreground">
                  Withdrawn ({withdrawn.length})
                </summary>
                <ul className="flex flex-col gap-2 w-full pt-2">
                  {withdrawn.map((payment) => (
                    <PaymentLine
                      key={payment.id}
                      payment={payment}
                      actions={
                        mayTouchPayments && mayArchive ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            onClick={() => restorePayment({ invoiceId: item.id, paymentId: payment.id })}
                          >
                            <Undo2 className="size-3.5" />
                            Restore
                          </Button>
                        ) : null
                      }
                    />
                  ))}
                </ul>
              </details>
            )}
          </SectionCard>

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

          <BulkDeleteDialog
            open={Boolean(withdrawTarget)}
            onOpenChange={(open) => !open && setWithdrawTarget(null)}
            items={withdrawTarget ? [{ id: withdrawTarget.id, primary: withdrawTarget.amount, secondary: `${withdrawTarget.paidAt} · ${withdrawTarget.method}` }] : []}
            itemLabel="payments"
            isPending={withdrawing}
            note="The payment comes off this invoice's paid figure, and stays listed under Withdrawn with who withdrew it. It can be restored."
            onConfirm={() =>
              withdrawPayment(
                { invoiceId: item.id, paymentId: withdrawTarget.id },
                { onSuccess: () => setWithdrawTarget(null) },
              )
            }
          />
        </>
      )}
    </DetailSheet>
  );
}
