"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import DetailCard from "@/components/trips/DetailCard";
import StatusBadge from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import AddReceivableDialog from "@/components/receivables/AddReceivableDialog";
import RecordPaymentDialog from "@/components/receivables/RecordPaymentDialog";
import AddOperatorPaymentDialog from "@/components/operator-payments/AddOperatorPaymentDialog";
import RecordOperatorPaymentDialog from "@/components/operator-payments/RecordOperatorPaymentDialog";
import { useCommissions } from "@/hooks/commissions";
import { useReceivables } from "@/hooks/receivables";
import { useOperatorPayables } from "@/hooks/operator-payments";
import { usePermissions } from "@/hooks/common/usePermissions";
import { Permission } from "@/lib/permissions";
import { toCommissionRow } from "@/lib/commission";
import { toReceivableRow } from "@/lib/receivable";
import { toPayableRow } from "@/lib/operatorPayment";
import { useReceivablesStore } from "@/store/useReceivablesStore";
import { useOperatorPaymentsStore } from "@/store/useOperatorPaymentsStore";
import { cn } from "@/lib/utils";

function StatBox({ label, value, tone = "foreground", highlight }) {
  return (
    <div className={cn("flex flex-col gap-0.5 sm:gap-1 rounded-sm border border-border p-2.5 sm:p-3 min-w-0", highlight && "bg-success/10")}>
      <p className="font-montserrat text-[10px] sm:text-[12px] text-muted-foreground truncate">{label}</p>
      <p
        className={cn(
          "font-montserrat font-bold text-[14px] sm:text-[18px] truncate",
          tone === "success" ? "text-success" : tone === "destructive" ? "text-destructive" : "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function Line({ children }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-border px-3 py-2 font-montserrat text-[12px]">
      {children}
    </li>
  );
}

/**
 * The trip's money, every figure the server's. This card used to derive the
 * operator cost as profit × 3.2 and a commission as 15% of profit — numbers
 * nobody entered, printed as if they were the books.
 *
 * Client paid and balance come from Receivables (#16): the API sums this
 * trip's sent invoices and their live payments, and each invoice is listed
 * with the figures it computed. The operator's bills come from Operator
 * Payments (#17) the same way. Commissions are listed the same way — not
 * summed here, because a total of estimates and settled figures is a number
 * nobody agreed. Operator cost, profit and margin are dashes for a role
 * without VIEW_FINANCIALS; the billing is a dash for a role that may not read
 * receivables.
 */
export default function TripFinancialCard({ trip }) {
  const f = trip?.financial ?? {};
  const billing = trip?.clientBilling ?? {};
  const { can, canWrite } = usePermissions();

  const mayViewCommissions = can(Permission.VIEW_COMMISSIONS);
  const { data } = useCommissions({ tripId: trip?.id, limit: 20 }, { enabled: Boolean(trip?.id) && mayViewCommissions });
  const commissions = (data?.data ?? []).map(toCommissionRow);

  const mayViewReceivables = can(Permission.VIEW_RECEIVABLES);
  const mayInvoice = canWrite(Permission.MANAGE_RECEIVABLES) && !trip?.isArchived;
  const { data: invoiceData } = useReceivables(
    { tripId: trip?.id, limit: 20 },
    { enabled: Boolean(trip?.id) && mayViewReceivables },
  );
  const invoices = (invoiceData?.data ?? []).map(toReceivableRow);
  const openAddModal = useReceivablesStore((s) => s.openAddModal);
  const openPaymentModal = useReceivablesStore((s) => s.openPaymentModal);

  const opBilling = trip?.operatorBilling ?? {};
  const mayViewBills = can(Permission.VIEW_OPERATOR_PAYMENTS);
  const mayRecordBills = canWrite(Permission.MANAGE_OPERATOR_PAYMENTS) && !trip?.isArchived;
  const { data: billData } = useOperatorPayables(
    { tripId: trip?.id, limit: 20 },
    { enabled: Boolean(trip?.id) && mayViewBills },
  );
  const bills = (billData?.data ?? []).map(toPayableRow);
  const openBillModal = useOperatorPaymentsStore((s) => s.openAddModal);
  const openOperatorPayment = useOperatorPaymentsStore((s) => s.openPaymentModal);

  return (
    <DetailCard title="Financial Summary" description="Computed by the server from the price, FET, the operator's cost and the invoices.">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <StatBox label="Client Total" value={f.total} />
        <StatBox label="Client Paid" value={billing.paid ?? "—"} tone="success" />
        <StatBox label="Client Balance" value={billing.balance ?? "—"} tone={billing.rawState === "OVERDUE" ? "destructive" : "foreground"} />
        <StatBox label="Operator Cost" value={f.operatorCost} />
        <StatBox label="Gross Profit" value={f.grossProfit} tone="success" highlight />
        <StatBox label="Margin" value={f.margin} />
        <StatBox label="FET" value={f.fet} />
        <StatBox label="Commissions" value={mayViewCommissions && data ? String(data.meta?.total ?? 0) : "—"} />
      </div>

      {mayViewReceivables && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-montserrat font-semibold text-[13px] text-foreground">
              Client invoices{billing.known ? ` · ${billing.state}` : ""}
            </p>
            {mayInvoice && (
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => openAddModal({ tripId: trip?.id })}>
                <Plus className="size-3.5" />
                Raise invoice
              </Button>
            )}
          </div>
          {invoices.length === 0 ? (
            <p className="font-montserrat text-[12px] text-muted-foreground">No invoices raised on this trip yet.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {invoices.map((row) => (
                <Line key={row.id}>
                  <span className="min-w-0 truncate">
                    <Link href={`/dashboard/receivables?invoice=${row.id}`} className="font-semibold text-purple hover:underline">
                      {row.number}
                    </Link>{" "}
                    · {row.client} · due {row.due}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="font-bold text-foreground">{row.total}</span>
                    <span className="text-muted-foreground">balance {row.balance}</span>
                    <StatusBadge status={row.state} />
                    {mayInvoice && row.rawStatus === "SENT" && row.hasBalance && (
                      <Button size="sm" variant="outline" onClick={() => openPaymentModal(row.raw)}>
                        Record payment
                      </Button>
                    )}
                  </span>
                </Line>
              ))}
            </ul>
          )}
        </div>
      )}

      {mayViewBills && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-montserrat font-semibold text-[13px] text-foreground">
              Operator bills
              {opBilling.known ? ` · ${opBilling.state}` : ""}
              {opBilling.known && opBilling.owed !== "—" ? ` · paid ${opBilling.paid} of ${opBilling.owed}` : ""}
            </p>
            {mayRecordBills && (
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => openBillModal({ tripId: trip?.id })}>
                <Plus className="size-3.5" />
                Record operator bill
              </Button>
            )}
          </div>
          {bills.length === 0 ? (
            <p className="font-montserrat text-[12px] text-muted-foreground">No operator bills recorded on this trip yet.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {bills.map((row) => (
                <Line key={row.id}>
                  <span className="min-w-0 truncate">
                    <Link href={`/dashboard/operator-payments?bill=${row.id}`} className="font-semibold text-purple hover:underline">
                      {row.number}
                    </Link>{" "}
                    · {row.operator} · due {row.due}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="font-bold text-foreground">{row.total}</span>
                    <span className="text-muted-foreground">balance {row.balance}</span>
                    <StatusBadge status={row.state} />
                    {mayRecordBills && row.rawStatus === "OPEN" && row.hasBalance && (
                      <Button size="sm" variant="outline" onClick={() => openOperatorPayment(row.raw)}>
                        Pay
                      </Button>
                    )}
                  </span>
                </Line>
              ))}
            </ul>
          )}
        </div>
      )}

      {mayViewCommissions && commissions.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {commissions.map((row) => (
            <Line key={row.id}>
              <span className="min-w-0 truncate">
                <Link href={`/dashboard/commissions?commission=${row.id}`} className="font-semibold text-purple hover:underline">
                  {row.reference}
                </Link>{" "}
                · {row.recipient} · {row.structure}
              </span>
              <span className="flex items-center gap-2">
                <span className="font-bold text-foreground">{row.amount}</span>
                <StatusBadge status={row.status} />
              </span>
            </Line>
          ))}
        </ul>
      )}

      {mayInvoice && (
        <>
          <AddReceivableDialog />
          <RecordPaymentDialog />
        </>
      )}
      {mayRecordBills && (
        <>
          <AddOperatorPaymentDialog />
          <RecordOperatorPaymentDialog />
        </>
      )}
    </DetailCard>
  );
}
