import { cn } from "@/lib/utils";

export default function TaskChip({ style, dot, children, className }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-1 font-montserrat font-medium text-[12px] whitespace-nowrap",
        className
      )}
      style={{ backgroundColor: style.bg, borderColor: style.border, color: style.text }}
    >
      {dot && <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: dot }} />}
      {children}
    </span>
  );
}
