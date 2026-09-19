"use client";

import { useMemo, useState } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

/**
 * The value this control speaks is `YYYY-MM-DD`, in and out.
 *
 * It used to emit `"Aug 12, 2026"` — the string the Figma mock showed — which
 * every date field on the API rejects with "Use a YYYY-MM-DD date". Quotes,
 * leads, aircraft maintenance and sourcing requests all send this value
 * straight to the server, so none of their dates could be saved at all.
 *
 * Display and wire format are two different things, exactly as they are for
 * enums: the API's vocabulary is what travels, and the friendly label is
 * produced at the edge, here, for reading only.
 */

/** Zero-padded, and built from the local parts — never `toISOString()`. */
function toIsoDate(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Accepts `YYYY-MM-DD` or a full ISO timestamp and returns `{ year, month,
 * day }`, or null.
 *
 * A timestamp is tolerated because mappers hand edit forms the stored value
 * (`rawDepartureDate`), which is `2026-11-14T00:00:00.000Z`. Only the date
 * part is read, and it is read as text: `new Date("2026-11-14")` parses as
 * midnight **UTC**, so anywhere west of Greenwich it renders as the 13th.
 */
function parseIsoDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? ""));
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  if (month < 0 || month > 11 || day < 1 || day > 31) return null;
  return { year, month, day };
}

/** "14 Nov 2026" — for reading, never for sending. */
function formatDisplay(value) {
  const parsed = parseIsoDate(value);
  if (!parsed) return "";
  return `${parsed.day} ${MONTH_NAMES[parsed.month].slice(0, 3)} ${parsed.year}`;
}

export function CommonDatePicker({
  value,
  onChange,
  placeholder = "Choose Date",
  className,
  iconClassName,
}) {
  const [open, setOpen] = useState(false);

  const selected = useMemo(() => parseIsoDate(value), [value]);

  /**
   * Which month the calendar opens on.
   *
   * The selected date if there is one, otherwise the real current month. It
   * used to be hardcoded to August 2026 — so editing a request departing in
   * November opened five months away from its own date, and a new request
   * opened in a month that had already passed.
   */
  const [view, setView] = useState(() => {
    if (selected) return { year: selected.year, month: selected.month };
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const firstDayOfWeek = new Date(view.year, view.month, 1).getDay();

  const step = (delta) =>
    setView((prev) => {
      const next = prev.month + delta;
      if (next < 0) return { year: prev.year - 1, month: 11 };
      if (next > 11) return { year: prev.year + 1, month: 0 };
      return { year: prev.year, month: next };
    });

  const commit = (year, month, day) => {
    onChange?.(toIsoDate(year, month, day));
    setOpen(false);
  };

  // A real today, read when the popover renders. The quick-select used to be
  // a literal "Today (Aug 12)" that set 12 August 2026 whatever the date was —
  // an invented value wearing the label of a real one.
  const today = new Date();
  const todayLabel = `Today (${today.getDate()} ${MONTH_NAMES[today.getMonth()].slice(0, 3)})`;

  const label = formatDisplay(value);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        // Re-open on whatever is selected now, so closing and reopening does
        // not strand the calendar wherever it was last browsed to.
        if (next && selected) setView({ year: selected.year, month: selected.month });
      }}
    >
      <PopoverTrigger
        className={cn(
          "h-11 w-full rounded-md border border-input bg-background px-3 font-montserrat text-[13px] text-left flex items-center justify-between gap-2 outline-none focus:ring-1 focus:ring-purple cursor-pointer transition-colors hover:border-purple/50",
          className
        )}
      >
        <span className={cn(label ? "text-foreground font-medium" : "text-muted-foreground")}>
          {label || placeholder}
        </span>
        <CalendarIcon className={cn("size-4 text-muted-foreground shrink-0", iconClassName)} />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-3 bg-white border border-border shadow-lg rounded-lg">
        {/* Month / Year Nav */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/50">
          <Button type="button" variant="ghost" size="icon-sm" onClick={() => step(-1)} className="h-7 w-7">
            <ChevronLeft className="size-4" />
          </Button>
          <span className="font-montserrat font-bold text-[13px] text-foreground">
            {MONTH_NAMES[view.month]} {view.year}
          </span>
          <Button type="button" variant="ghost" size="icon-sm" onClick={() => step(1)} className="h-7 w-7">
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
            // An exact comparison. It used to be `value.includes("Aug 1")`,
            // so choosing the 1st highlighted the 1st, 10th and every teens
            // date in the month at once.
            const isSelected =
              selected?.year === view.year &&
              selected?.month === view.month &&
              selected?.day === day;

            return (
              <button
                key={day}
                type="button"
                onClick={() => commit(view.year, view.month, day)}
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

        {/* Quick select */}
        <div className="pt-2 mt-2 border-t border-border/50 flex justify-between items-center">
          <button
            type="button"
            onClick={() => commit(today.getFullYear(), today.getMonth(), today.getDate())}
            className="font-montserrat text-[11px] text-purple font-semibold hover:underline cursor-pointer"
          >
            {todayLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              // Empty string, not null: callers turn a blank into `undefined`
              // on create and `null` on update, and both read `""` as "unset".
              onChange?.("");
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
