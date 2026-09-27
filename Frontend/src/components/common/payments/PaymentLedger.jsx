"use client";

import { useState } from "react";
import { Undo2 } from "lucide-react";
import SectionCard from "@/components/common/SectionCard";
import BulkDeleteDialog from "@/components/common/BulkDeleteDialog";
import { Button } from "@/components/ui/button";
import { toPaymentRow } from "@/lib/payment";

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
 * A bill's payment ledger on a detail sheet — the live payments and, folded
 * away, the withdrawn ones with who withdrew them. Shared by a client
 * invoice's sheet and an operator bill's.
 *
 * Every action is hidden rather than disabled when its flag is false. A
 * withdrawal is confirmed first, naming the payment. `onWithdraw(payment,
 * done)` must call `done()` once the API has answered.
 */
export default function PaymentLedger({
  payments = [],
  withdrawn = [],
  emptyText = "No payments recorded yet.",
  mayCorrect = false,
  mayWithdraw = false,
  mayRestore = false,
  withdrawing = false,
  onCorrect,
  onWithdraw,
  onRestore,
}) {
  const live = payments.map(toPaymentRow);
  const off = withdrawn.map(toPaymentRow);
  const [target, setTarget] = useState(null);

  return (
    <SectionCard title={`Payments (${live.length})`} titleClassName="text-foreground">
      {live.length === 0 ? (
        <p className="font-montserrat text-[13px] text-muted-foreground w-full">{emptyText}</p>
      ) : (
        <ul className="flex flex-col gap-2 w-full">
          {live.map((payment) => (
            <PaymentLine
              key={payment.id}
              payment={payment}
              actions={
                mayCorrect || mayWithdraw ? (
                  <span className="flex gap-1.5">
                    {mayCorrect && (
                      <Button size="sm" variant="outline" onClick={() => onCorrect?.(payment.raw)}>
                        Correct
                      </Button>
                    )}
                    {mayWithdraw && (
                      <Button size="sm" variant="destructive" onClick={() => setTarget(payment)}>
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

      {off.length > 0 && (
        <details className="w-full">
          <summary className="cursor-pointer font-montserrat text-[12px] font-semibold text-muted-foreground">
            Withdrawn ({off.length})
          </summary>
          <ul className="flex flex-col gap-2 w-full pt-2">
            {off.map((payment) => (
              <PaymentLine
                key={payment.id}
                payment={payment}
                actions={
                  mayRestore ? (
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => onRestore?.(payment.raw)}>
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

      <BulkDeleteDialog
        open={Boolean(target)}
        onOpenChange={(open) => !open && setTarget(null)}
        items={target ? [{ id: target.id, primary: target.amount, secondary: `${target.paidAt} · ${target.method}` }] : []}
        itemLabel="payments"
        isPending={withdrawing}
        note="The payment comes off this bill's paid figure, and stays listed under Withdrawn with who withdrew it. It can be restored."
        onConfirm={() => onWithdraw?.(target.raw, () => setTarget(null))}
      />
    </SectionCard>
  );
}
