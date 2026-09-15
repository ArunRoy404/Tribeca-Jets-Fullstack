"use client";

import { useState } from "react";
import { Clock } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const TIME_PRESETS = [
  "08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
  "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM",
  "06:00 PM", "07:00 PM", "08:00 PM", "09:00 PM"
];

export function CommonTimePicker({
  value,
  onChange,
  placeholder = "Choose Time",
  className,
  iconClassName,
}) {
  const [open, setOpen] = useState(false);
  const [customTime, setCustomTime] = useState("");

  const handleSelectTime = (time) => {
    onChange(time);
    setOpen(false);
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (customTime.trim()) {
      onChange(customTime.trim());
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "h-11 w-full rounded-md border border-input bg-background px-3 font-montserrat text-[13px] text-left flex items-center justify-between gap-2 outline-none focus:ring-1 focus:ring-purple cursor-pointer transition-colors hover:border-purple/50",
            className
          )}
        >
          <span className={cn(value ? "text-foreground font-medium" : "text-muted-foreground")}>
            {value || placeholder}
          </span>
          <Clock className={cn("size-4 text-muted-foreground shrink-0", iconClassName)} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-3 bg-white border border-border shadow-lg rounded-lg flex flex-col gap-3">
        <p className="font-montserrat font-bold text-[12px] text-foreground border-b border-border/50 pb-1.5">
          Select Time
        </p>

        {/* Time Presets Grid */}
        <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto p-0.5">
          {TIME_PRESETS.map((time) => {
            const isSelected = value === time;
            return (
              <button
                key={time}
                type="button"
                onClick={() => handleSelectTime(time)}
                className={cn(
                  "px-2.5 py-1.5 rounded-md font-montserrat text-[12px] text-center transition-colors cursor-pointer",
                  isSelected
                    ? "bg-purple text-white font-bold"
                    : "bg-secondary/40 hover:bg-purple/10 text-foreground font-medium"
                )}
              >
                {time}
              </button>
            );
          })}
        </div>

        {/* Manual Custom Time Entry */}
        <form onSubmit={handleCustomSubmit} className="pt-2 border-t border-border/50 flex gap-2">
          <Input
            placeholder="e.g. 18:30"
            value={customTime}
            onChange={(e) => setCustomTime(e.target.value)}
            className="h-8 text-[12px] font-montserrat"
          />
          <button
            type="submit"
            className="px-3 h-8 rounded-md bg-purple text-white font-montserrat font-medium text-[11px] shrink-0 hover:bg-purple/90 cursor-pointer"
          >
            Set
          </button>
        </form>
      </PopoverContent>
    </Popover>
  );
}

export default CommonTimePicker;
