"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export default function CommonSelect({
  value,
  onChange,
  options = [],
  placeholder = "Select...",
  className,
}) {
  const normalizedOptions = options.map((opt) =>
    typeof opt === "string" ? { label: opt, value: opt } : opt
  );

  // No value at all — not a sentinel string — is what makes SelectValue fall
  // back to the placeholder. A sentinel with no matching SelectItem in the
  // list renders as literal text instead, since nothing can resolve it to a
  // label.
  return (
    <Select value={value || undefined} onValueChange={(val) => onChange?.(val)}>
      <SelectTrigger
        className={cn(
          // The primitive's own base classes set the height behind a
          // `data-[size=default]:` variant; a plain `h-11` here shares no
          // modifier with that rule, so it never wins the cascade. Matching
          // the same variant is what actually overrides it.
          "data-[size=default]:h-11 w-full rounded-md border border-input bg-background px-3 font-montserrat text-[13px] text-foreground outline-none focus:ring-2 focus:ring-purple/50 focus:border-purple cursor-pointer transition-all flex items-center justify-between",
          className
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-white border border-border shadow-lg rounded-md z-50 min-w-[var(--radix-select-trigger-width)]">
        {normalizedOptions.map((opt, idx) => (
          <SelectItem
            key={opt.value || idx}
            value={opt.value}
            className="font-montserrat text-[13px] cursor-pointer hover:bg-purple/10 focus:bg-purple/10 py-2 text-foreground"
          >
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
