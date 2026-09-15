"use client";

import { useId, useState } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export default function FilterTabs({ options, value, defaultValue, onValueChange, className }) {
  const instanceId = useId();
  const [internalValue, setInternalValue] = useState(defaultValue || options?.[0]);
  const activeValue = value !== undefined ? value : internalValue;

  const handleChange = (val) => {
    if (value === undefined) {
      setInternalValue(val);
    }
    onValueChange?.(val);
  };

  return (
    <Tabs value={activeValue} onValueChange={handleChange} className={className}>
      <TabsList className="relative h-auto w-fit max-w-full flex-wrap gap-1 rounded-md bg-white border border-border p-1 shadow-none group-data-horizontal/tabs:h-auto">
        {options?.map((option) => {
          const isActive = activeValue === option;
          return (
            <TabsTrigger
              key={option}
              value={option}
              className={cn(
                "relative z-10 h-auto flex-none grow-0 rounded border-0 px-3 py-1 font-montserrat text-xs font-medium transition-colors shadow-none outline-none focus:outline-none focus-visible:ring-0 focus-visible:outline-none after:hidden group-data-[variant=default]/tabs-list:data-active:shadow-none data-active:border-transparent data-active:bg-transparent data-active:shadow-none",
                isActive
                  ? "text-primary-foreground hover:text-primary-foreground data-active:text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isActive && (
                <motion.span
                  layoutId={`active-filter-tab-${instanceId}`}
                  className="absolute inset-0 -z-10 rounded bg-primary shadow-none"
                  transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                />
              )}
              <span className="relative z-10">{option}</span>
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}
