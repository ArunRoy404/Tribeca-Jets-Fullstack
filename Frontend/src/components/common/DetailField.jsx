import { cn } from "@/lib/utils";

export default function DetailField({ label, value, className, labelClassName, valueClassName }) {
  return (
    <div className={cn("flex flex-1 min-w-0 flex-col gap-2 items-start border-b border-secondary pb-2", className)}>
      <p className={cn("font-montserrat font-normal text-[12px] text-muted-foreground", labelClassName)}>{label}</p>
      <p className={cn("font-montserrat font-bold text-[14px] text-foreground", valueClassName)}>{value}</p>
    </div>
  );
}
