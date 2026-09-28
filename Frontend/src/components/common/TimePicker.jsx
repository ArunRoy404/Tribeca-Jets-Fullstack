"use client";

import { useState } from "react";
import { Clock } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { formatTime24, parseTime } from "@/lib/time";
import { cn } from "@/lib/utils";

/** Values, 24-hour "HH:MM" — what the API stores and the date parsers read. */
const TIME_PRESETS = [
  "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00",
  "18:00", "19:00", "20:00", "21:00",
];

/**
 * A time of day. **The value is "HH:MM", 24-hour; the 12-hour text is only the
 * label** — the same rule `CommonDatePicker` learned for dates.
 *
 * It used to emit the label itself ("08:00 AM"). The follow-up dialog builds a
 * timestamp with `new Date(\`${date}T${time}\`)`, which is an Invalid Date for
 * "08:00 AM", and bails out silently — so scheduling a follow-up at any picked
 * time did nothing at all. The trip form would have sent the same string to
 * an API that only accepts "HH:MM".
 *
 * The custom box accepts either form ("18:30", "6:30 pm") and normalises it;
 * something that is not a time is refused on the spot rather than stored.
 */
export function CommonTimePicker({
  value,
  onChange,
  placeholder = "Choose Time",
  className,
  iconClassName,
}) {
  const [open, setOpen] = useState(false);
  const [customTime, setCustomTime] = useState("");
  const [customError, setCustomError] = useState(false);

  const handleSelectTime = (time) => {
    onChange?.(time);
    setOpen(false);
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    const parsed = parseTime(customTime);
    if (!parsed) {
      setCustomError(true);
      return;
    }
    setCustomError(false);
    setCustomTime("");
    onChange?.(parsed);
    setOpen(false);
  };

  // A value from before this fix ("08:00 AM") still reads correctly.
  const current = parseTime(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {/* The trigger *is* the button. Base UI has no `asChild`: passing it
          rendered the trigger's own <button> around this one, and a button
          inside a button broke hydration on every form using this picker. */}
      <PopoverTrigger
        className={cn(
          "h-11 w-full rounded-md border border-input bg-background px-3 font-montserrat text-[13px] text-left flex items-center justify-between gap-2 outline-none focus:ring-1 focus:ring-purple cursor-pointer transition-colors hover:border-purple/50",
          className
        )}
      >
        <span className={cn(current ? "text-foreground font-medium" : "text-muted-foreground")}>
          {current ? formatTime24(current) : placeholder}
        </span>
        <Clock className={cn("size-4 text-muted-foreground shrink-0", iconClassName)} />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-3 bg-white border border-border shadow-lg rounded-lg flex flex-col gap-3">
        <p className="font-montserrat font-bold text-[12px] text-foreground border-b border-border/50 pb-1.5">
          Select Time
        </p>

        <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto p-0.5">
          {TIME_PRESETS.map((time) => {
            const isSelected = current === time;
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
                {formatTime24(time)}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleCustomSubmit} className="pt-2 border-t border-border/50 flex flex-col gap-1">
          <div className="flex gap-2">
            <Input
              placeholder="e.g. 18:30"
              value={customTime}
              onChange={(e) => {
                setCustomTime(e.target.value);
                setCustomError(false);
              }}
              className="h-8 text-[12px] font-montserrat"
            />
            <button
              type="submit"
              className="px-3 h-8 rounded-md bg-purple text-white font-montserrat font-medium text-[11px] shrink-0 hover:bg-purple/90 cursor-pointer"
            >
              Set
            </button>
          </div>
          {customError && (
            <p className="font-montserrat text-[11px] text-destructive">Use a time like 18:30 or 6:30 PM.</p>
          )}
        </form>
      </PopoverContent>
    </Popover>
  );
}

export default CommonTimePicker;
