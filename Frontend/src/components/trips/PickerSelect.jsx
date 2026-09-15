"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export default function PickerSelect({ value, onChange, options = [], placeholder, className }) {
  const normalizedOptions = options.map((opt) =>
    typeof opt === "string" ? { label: opt, value: opt } : opt
  );

  return (
    <Select value={value || undefined} onValueChange={(val) => onChange && onChange(val)}>
      <SelectTrigger
        className={cn(
          "h-13 w-full rounded-sm bg-white px-4 font-montserrat text-base font-medium border-input cursor-pointer",
          className
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-white border border-border shadow-lg rounded-md z-50">
        {normalizedOptions.map((opt, idx) => (
          <SelectItem
            key={opt.value || idx}
            value={opt.value}
            className="font-montserrat text-base cursor-pointer py-2"
          >
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
