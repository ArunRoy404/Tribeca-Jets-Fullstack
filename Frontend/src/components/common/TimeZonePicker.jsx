"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import CommonInput from "@/components/common/CommonInput";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const searchText = (value) => value.toLowerCase().replaceAll("_", " ").trim();

/** The fixed IANA list, showing each zone's current offset. */
export default function TimeZonePicker({
  label,
  value,
  onChange,
  allowDefault = false,
  defaultLabel = "Company default",
  description,
  disabled = false,
  error,
}) {
  const id = useId();
  const listId = `${id}-list`;
  const listRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [active, setActive] = useState(0);

  const options = useMemo(() => {
    if (!open) return [];
    const now = new Date();
    const zones = Intl.supportedValuesOf("timeZone").map((timeZone) => {
      const parts = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "shortOffset" }).formatToParts(now);
      const offset = parts.find((part) => part.type === "timeZoneName")?.value;
      return { value: timeZone, label: offset ? `${timeZone} · ${offset}` : timeZone };
    });
    return allowDefault ? [{ value: null, label: defaultLabel }, ...zones] : zones;
  }, [open, allowDefault, defaultLabel]);
  const matches = options.filter((option) => searchText(option.label).includes(searchText(search)));
  const selectedLabel = value ?? (allowDefault ? defaultLabel : "Select a time zone");

  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView?.({ block: "nearest" });
  }, [active, open, search]);

  function handleOpenChange(next) {
    setOpen(next);
    if (!next) {
      setSearch("");
      setActive(0);
    }
  }

  function choose(option) {
    onChange?.(option.value);
    handleOpenChange(false);
  }

  function handleSearchKeys(event) {
    if (!["ArrowUp", "ArrowDown", "Enter"].includes(event.key)) return;
    event.preventDefault();
    if (!matches.length) return;
    if (event.key === "Enter") {
      choose(matches[active]);
    } else {
      const change = event.key === "ArrowDown" ? 1 : -1;
      setActive((index) => Math.max(0, Math.min(index + change, matches.length - 1)));
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Label htmlFor={id} className="font-montserrat text-base font-medium text-foreground">
        {label}
      </Label>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger
          id={id}
          disabled={disabled}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? `${id}-error` : description ? `${id}-description` : undefined}
          className="flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-left font-montserrat text-[13px] font-medium outline-none focus-visible:ring-1 focus-visible:ring-purple data-popup-open:ring-1 data-popup-open:ring-purple disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-destructive"
        >
          <span className="min-w-0 truncate">{selectedLabel}</span>
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-(--anchor-width) min-w-64 max-w-[calc(100vw-2rem)] gap-0 overflow-hidden p-0">
          <div className="flex items-center gap-2 border-b border-border px-3">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <CommonInput
              name={`${id}-search`}
              placeholder="Search time zones…"
              aria-label="Search time zones"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={open}
              aria-controls={listId}
              aria-activedescendant={matches[active] ? `${listId}-${active}` : undefined}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setActive(0);
              }}
              onKeyDown={handleSearchKeys}
              className="h-10 border-transparent bg-transparent px-0 shadow-none focus-visible:border-transparent focus-visible:ring-0"
            />
          </div>
          <div ref={listRef} id={listId} role="listbox" aria-label="Time zones" className="max-h-72 overflow-y-auto p-1">
            {matches.map((option, index) => (
              <Button
                key={option.value ?? ""}
                id={`${listId}-${index}`}
                type="button"
                variant="ghost"
                role="option"
                tabIndex={-1}
                aria-selected={option.value === value}
                data-active={index === active}
                onClick={() => choose(option)}
                className={cn(
                  "h-auto w-full justify-between rounded-md px-2.5 py-2 text-left text-[13px] text-foreground",
                  index === active && "bg-secondary",
                )}
              >
                <span className="min-w-0 truncate">{option.label}</span>
                {option.value === value && <Check className="size-4 shrink-0 text-purple" />}
              </Button>
            ))}
          </div>
          {!matches.length && <p className="px-3 py-2 font-montserrat text-xs text-muted-foreground">No matching time zones.</p>}
        </PopoverContent>
      </Popover>
      {description && <p id={`${id}-description`} className="font-montserrat text-xs text-muted-foreground">{description}</p>}
      {error && <p id={`${id}-error`} className="font-montserrat text-sm font-medium text-destructive">{error}</p>}
    </div>
  );
}
