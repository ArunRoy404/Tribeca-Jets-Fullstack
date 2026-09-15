"use client";

import { useState } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function CommonDatePicker({
  value,
  onChange,
  placeholder = "Choose Date",
  className,
  iconClassName,
}) {
  const [open, setOpen] = useState(false);

  // Default display month: August 2026 or current date
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(7); // 0-indexed: 7 = August

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (day) => {
    const monthShort = MONTH_NAMES[currentMonth].slice(0, 3);
    const dateStr = `${monthShort} ${day}, ${currentYear}`;
    if (onChange) onChange(dateStr);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "h-11 w-full rounded-md border border-input bg-background px-3 font-montserrat text-[13px] text-left flex items-center justify-between gap-2 outline-none focus:ring-1 focus:ring-purple cursor-pointer transition-colors hover:border-purple/50",
          className
        )}
      >
        <span className={cn(value ? "text-foreground font-medium" : "text-muted-foreground")}>
          {value || placeholder}
        </span>
        <CalendarIcon className={cn("size-4 text-muted-foreground shrink-0", iconClassName)} />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-3 bg-white border border-border shadow-lg rounded-lg">
        {/* Month / Year Nav */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/50">
          <Button type="button" variant="ghost" size="icon-sm" onClick={prevMonth} className="h-7 w-7">
            <ChevronLeft className="size-4" />
          </Button>
          <span className="font-montserrat font-bold text-[13px] text-foreground">
            {MONTH_NAMES[currentMonth]} {currentYear}
          </span>
          <Button type="button" variant="ghost" size="icon-sm" onClick={nextMonth} className="h-7 w-7">
            <ChevronRight className="size-4" />
          </Button>
        </div>

        {/* Weekday Labels */}
        <div className="grid grid-cols-7 gap-1 text-center mb-1">
          {WEEKDAYS.map((day) => (
            <span key={day} className="font-montserrat font-medium text-[11px] text-muted-foreground">
              {day}
            </span>
          ))}
        </div>

        {/* Calendar Days Grid */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="h-8" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const monthShort = MONTH_NAMES[currentMonth].slice(0, 3);
            const isSelected = value && value.includes(`${monthShort} ${day}`);

            return (
              <button
                key={day}
                type="button"
                onClick={() => handleSelectDay(day)}
                className={cn(
                  "h-8 w-8 rounded-md font-montserrat text-[12px] flex items-center justify-center transition-colors cursor-pointer mx-auto",
                  isSelected
                    ? "bg-purple text-white font-bold"
                    : "hover:bg-purple/10 text-foreground font-medium"
                )}
              >
                {day}
              </button>
            );
          })}
        </div>

        {/* Quick select today */}
        <div className="pt-2 mt-2 border-t border-border/50 flex justify-between items-center">
          <button
            type="button"
            onClick={() => {
              setCurrentYear(2026);
              setCurrentMonth(7);
              handleSelectDay(12);
            }}
            className="font-montserrat text-[11px] text-purple font-semibold hover:underline cursor-pointer"
          >
            Today (Aug 12)
          </button>
          <button
            type="button"
            onClick={() => {
              if (onChange) onChange("");
              setOpen(false);
            }}
            className="font-montserrat text-[11px] text-muted-foreground hover:underline cursor-pointer"
          >
            Clear
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default CommonDatePicker;
