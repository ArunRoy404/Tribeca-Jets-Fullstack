import { cn } from "@/lib/utils";

const TONES = {
  signal: "bg-signal-soft text-signal",
  success: "bg-success/10 text-success",
  warning: "bg-pending-bg text-pending-fg",
};

/** The small rounded label beside a setting — "Required", "Planned". */
export default function SettingsPill({ tone = "signal", children, className }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2.5 py-[5px] font-montserrat font-medium text-[11px] leading-normal whitespace-nowrap",
        TONES[tone] ?? TONES.signal,
        className
      )}
    >
      {children}
    </span>
  );
}
