import FinanceItem from "@/components/dashboard/financial-attention/FinanceItem";
import FinanceTotalSummary from "@/components/dashboard/financial-attention/FinanceTotalSummary";

export default function FinanceColumn({ title, rows, total, totalLabel, divider }) {
  return (
    <div
      className={`relative flex flex-1 flex-col gap-4 items-start min-w-0 p-4 w-full ${
        divider ? "border-b lg:border-b-0 lg:border-r border-border" : ""
      }`}
    >
      <p className="font-montserrat font-bold text-[10px] text-muted-foreground w-full">{title}</p>
      <div className="flex flex-col gap-2 items-start w-full">
        {rows?.map((row) => (
          <FinanceItem key={row?.id || row?.name + row?.amount} row={row} />
        ))}
      </div>
      <FinanceTotalSummary totalLabel={totalLabel} total={total} />
    </div>
  );
}
