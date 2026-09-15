"use client";

import CommonCard from "@/components/common/CommonCard";
import SectionHeader from "@/components/common/SectionHeader";
import Reveal from "@/components/common/Reveal";
import FinanceColumn from "@/components/dashboard/financial-attention/FinanceColumn";
import { useDashboardStore } from "@/store/useDashboardStore";

export default function FinancialAttention({ revealDelay = 0 }) {
  const receivables = useDashboardStore((s) => s.financialReceivables);
  const payments = useDashboardStore((s) => s.financialPayments);

  return (
    <Reveal delay={revealDelay} className="w-full">
      <CommonCard variant="default" className="p-0 rounded-md overflow-hidden border-border w-full">
        <SectionHeader
          title="Financial Attention"
          rightText="View Finance →"
          rightHref="/dashboard/transactions"
        />

        <div className="relative flex flex-col lg:flex-row items-start justify-center w-full">
          <FinanceColumn
            title="Client Receivables"
            rows={receivables}
            total="$43,000"
            totalLabel="Total outstanding"
            divider
          />
          <FinanceColumn
            title="Operator Payments"
            rows={payments}
            total="$30,300"
            totalLabel="Total due to operators"
          />
        </div>
      </CommonCard>
    </Reveal>
  );
}
