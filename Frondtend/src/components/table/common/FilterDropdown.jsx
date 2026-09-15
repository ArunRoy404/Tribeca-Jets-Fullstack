"use client";

import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function FilterDropdown({ label, value, options, onChange }) {
  const activeLabel = value === "All" ? label : value;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="bg-secondary border border-border flex gap-1 h-full items-center px-2 py-1 rounded-sm shrink-0 cursor-pointer outline-none">
        <p className="font-montserrat font-medium text-[10px] text-foreground whitespace-nowrap">{activeLabel}</p>
        <ChevronDown className="size-3.5 text-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-40">
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          {options?.map((option) => (
            <DropdownMenuRadioItem key={option} value={option}>
              {option}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
