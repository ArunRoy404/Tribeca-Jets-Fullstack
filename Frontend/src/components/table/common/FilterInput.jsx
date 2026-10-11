"use client";

import { cn } from "@/lib/utils";

/**
 * Compact numeric / text filter input for CRM table toolbars.
 * Matches SearchInput and FilterDropdown sizing, padding and typography exactly.
 */
export default function FilterInput({
  value,
  onChange,
  placeholder,
  type = "text",
  className,
  ...props
}) {
  return (
    <div
      className={cn(
        "bg-secondary flex items-center border border-border shrink-0 px-2 py-1 rounded-sm",
        className,
      )}
    >
      <input
        type={type}
        value={value ?? ""}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full min-w-0 bg-transparent font-montserrat text-[10px] font-medium text-foreground placeholder:text-muted-foreground outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        {...props}
      />
    </div>
  );
}
