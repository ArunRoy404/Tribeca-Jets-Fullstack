import FinanceStatusBadge from "@/components/dashboard/financial-attention/FinanceStatusBadge";

export default function FinanceItem({ row }) {
  return (
    <div className="border-b border-border flex items-center justify-between px-2 py-1 w-full">
      <div className="flex flex-1 flex-col gap-2 items-start min-w-0 text-[12px]">
        <p className="font-montserrat font-semibold text-foreground w-full">{row?.name}</p>
        <p className="font-montserrat font-normal text-muted-foreground w-full">{row?.meta}</p>
      </div>
      <div className="flex gap-2 items-center shrink-0">
        <p className="font-montserrat font-semibold text-[12px] text-foreground whitespace-nowrap">{row?.amount}</p>
        <FinanceStatusBadge status={row?.status} />
      </div>
    </div>
  );
}
