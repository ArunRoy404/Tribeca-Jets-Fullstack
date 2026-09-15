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

  const handleValueChange = (val) => {
    if (onChange) {
      onChange(val === "__empty__" ? "" : val);
    }
  };

  const selectedVal = value === "" || value === null || value === undefined ? "__empty__" : value;

  return (
    <Select value={selectedVal} onValueChange={handleValueChange}>
      <SelectTrigger
        className={cn(
          "h-11 w-full rounded-md border border-input bg-background px-3 font-montserrat text-[13px] text-foreground outline-none focus:ring-2 focus:ring-purple/50 focus:border-purple cursor-pointer transition-all flex items-center justify-between",
          className
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-white border border-border shadow-lg rounded-md z-50 min-w-[var(--radix-select-trigger-width)]">
        {normalizedOptions.map((opt, idx) => {
          const itemVal = opt.value === "" ? "__empty__" : opt.value;
          return (
            <SelectItem
              key={itemVal || idx}
              value={itemVal}
              className="font-montserrat text-[13px] cursor-pointer hover:bg-purple/10 focus:bg-purple/10 py-2 text-foreground"
            >
              {opt.label}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
