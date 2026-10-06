"use client";

import { SETTINGS_SECTIONS } from "@/lib/settings";
import { cn } from "@/lib/utils";

/**
 * The section list. A column beside the content from `lg`; below that, a
 * row of the same cards that scrolls sideways, so the content keeps the full
 * width of a phone.
 */
export default function SettingsNav({ value, onChange }) {
  return (
    <nav
      aria-label="Settings sections"
      className="flex lg:flex-col gap-2 w-full lg:w-[250px] shrink-0 overflow-x-auto lg:overflow-visible -mx-4 px-4 sm:mx-0 sm:px-0 pb-1 lg:pb-0"
    >
      {SETTINGS_SECTIONS.map((section) => {
        const active = section.id === value;
        return (
          <button
            key={section.id}
            type="button"
            onClick={() => onChange?.(section.id)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-col gap-[3px] items-start text-left px-3.5 py-3 rounded-md border w-[200px] lg:w-full shrink-0 cursor-pointer transition-colors",
              active ? "bg-signal-soft border-signal-soft" : "bg-white border-border hover:bg-surface"
            )}
          >
            <span
              className={cn(
                "font-montserrat font-medium text-[14px] leading-normal",
                active ? "text-signal" : "text-foreground"
              )}
            >
              {section.label}
            </span>
            <span className="font-montserrat text-[10px] leading-normal text-muted-foreground">
              {section.description}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
