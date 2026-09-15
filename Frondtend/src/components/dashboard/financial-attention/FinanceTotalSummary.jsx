export default function FinanceTotalSummary({ totalLabel, total }) {
  return (
    <div className="border-t border-border flex items-center justify-between pt-3 w-full text-[12px]">
      <p className="font-montserrat font-normal text-muted-foreground">{totalLabel}</p>
      <p className="font-montserrat font-bold text-foreground">{total}</p>
    </div>
  );
}
