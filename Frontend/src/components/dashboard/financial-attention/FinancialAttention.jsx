"use client";

import CommonCard from "@/components/common/CommonCard";
import SectionHeader from "@/components/common/SectionHeader";
import Reveal from "@/components/common/Reveal";
import FinanceColumn from "@/components/dashboard/financial-attention/FinanceColumn";
import { useReceivables, useReceivableStats } from "@/hooks/receivables";
import { useOperatorPayables, useOperatorPayableStats } from "@/hooks/operator-payments";
import { usePermissions } from "@/hooks/common/usePermissions";
import { Permission } from "@/lib/permissions";
import { queryPresets } from "@/config/query.config";
import { formatMoneyExact } from "@/lib/money";
import { toReceivableRow } from "@/lib/receivable";
import { toPayableRow } from "@/lib/operatorPayment";

const SHOWN = 4;
const OPEN_SOONEST = { open: true, sortBy: "dueDate", sortOrder: "asc", limit: SHOWN };

/**
 * What clients still owe and what is still owed to operators, soonest due
 * first — the Receivables and Operator Payments lists with `open=true`, and
 * their own stats for the totals. A column the role may not read is not
 * drawn; with neither, the section is not drawn at all.
 */
export default function FinancialAttention({ revealDelay = 0 }) {
  const { can } = usePermissions();
  const seesReceivables = can(Permission.VIEW_RECEIVABLES);
  const seesPayables = can(Permission.VIEW_OPERATOR_PAYMENTS);

  const invoices = useReceivables(OPEN_SOONEST, { ...queryPresets.live, enabled: seesReceivables });
  const invoiceStats = useReceivableStats({}, { enabled: seesReceivables });
  const bills = useOperatorPayables(OPEN_SOONEST, { ...queryPresets.live, enabled: seesPayables });
  const billStats = useOperatorPayableStats({}, { enabled: seesPayables });

  if (!seesReceivables && !seesPayables) return null;

  const receivableRows = (invoices?.data?.data ?? []).map((invoice) => {
    const row = toReceivableRow(invoice);
    return {
      id: row?.id,
      name: row?.client,
      meta: `${row?.number} · ${row?.tripReference} · Due ${row?.due}`,
      amount: row?.balance,
      status: row?.state,
    };
  });
  const payableRows = (bills?.data?.data ?? []).map((payable) => {
    const row = toPayableRow(payable);
    return {
      id: row?.id,
      name: row?.operator,
      meta: `${row?.number} · ${row?.tripReference} · Due ${row?.due}`,
      amount: row?.balance,
      status: row?.state,
    };
  });

  return (
    <Reveal delay={revealDelay} className="w-full">
      <CommonCard variant="default" className="p-0 rounded-md overflow-hidden border-border w-full">
        <SectionHeader
          title="Financial Attention"
          rightText="View Finance →"
          rightHref="/dashboard/transactions"
        />

        <div className="relative flex flex-col lg:flex-row items-start justify-center w-full">
          {seesReceivables ? (
            <FinanceColumn
              title="Client Receivables"
              rows={receivableRows}
              isLoading={invoices?.isPending}
              error={invoices?.error}
              emptyMessage="No client owes anything"
              total={invoiceStats?.data ? formatMoneyExact(invoiceStats.data.outstanding) : "—"}
              totalLabel="Total outstanding"
              divider={seesPayables}
            />
          ) : null}
          {seesPayables ? (
            <FinanceColumn
              title="Operator Payments"
              rows={payableRows}
              isLoading={bills?.isPending}
              error={bills?.error}
              emptyMessage="Nothing owed to operators"
              total={billStats?.data ? formatMoneyExact(billStats.data.outstanding) : "—"}
              totalLabel="Total due to operators"
            />
          ) : null}
        </div>
      </CommonCard>
    </Reveal>
  );
}
