"use client";

import { Plus, X } from "lucide-react";
import DatePicker from "@/components/common/DatePicker";
import CommonInput from "@/components/common/CommonInput";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** The same manifest fields in the full trip form and the detail-card editor. */
export default function PassengerManifestFields({ passengers = [], updatePassenger, removePassenger, addPassenger, compact = false }) {
  return (
    <div className="flex flex-col gap-2.5">
      {passengers.map((p, index) => {
        const isLead = index === 0;

        return (
          <div
            key={p?.id ?? `p-${index}`}
            className={compact ? "flex flex-col gap-2 rounded-md border border-border p-2.5" : "flex flex-col sm:flex-row sm:items-center gap-2 rounded-md border border-border p-2.5 sm:border-0 sm:p-0"}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="flex items-center justify-center size-6 rounded-full bg-secondary font-montserrat font-semibold text-[11px] text-foreground shrink-0">
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <CommonInput
                  className="h-10 rounded-md text-[13px]"
                  aria-label={`Passenger ${index + 1} full name`}
                  maxLength={200}
                  placeholder={`Passenger ${index + 1} full name`}
                  value={p?.fullName || ""}
                  onChange={(e) => updatePassenger?.(index, "fullName", e.target.value)}
                />
              </div>
              {(!isLead || compact) && (
                <button
                  type="button"
                  onClick={() => removePassenger?.(index)}
                  aria-label={`Remove passenger ${index + 1}`}
                  className={cn("flex items-center justify-center size-8 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive cursor-pointer transition-colors shrink-0", !compact && "sm:hidden")}
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
            <div className={cn("grid grid-cols-2 gap-2", !compact && "sm:flex sm:items-center")}>
              <div className={cn(!compact && "sm:w-36")}>
                <DatePicker
                  className="h-10 text-[13px] rounded-md"
                  value={p?.dateOfBirth}
                  onChange={(v) => updatePassenger?.(index, "dateOfBirth", v)}
                  placeholder="Date of Birth"
                />
              </div>
              <div className={cn("min-w-0", !compact && "sm:w-32")}>
                <CommonInput
                  className="h-10 rounded-md text-[13px]"
                  aria-label={`Passenger ${index + 1} passport number`}
                  maxLength={40}
                  placeholder="Passport..."
                  value={p?.passportNumber || ""}
                  onChange={(e) => updatePassenger?.(index, "passportNumber", e.target.value)}
                />
              </div>
              {!compact && (!isLead ? (
                <button
                  type="button"
                  onClick={() => removePassenger?.(index)}
                  aria-label={`Remove passenger ${index + 1}`}
                  className="hidden sm:flex items-center justify-center size-8 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive cursor-pointer transition-colors shrink-0"
                >
                  <X className="size-4" />
                </button>
              ) : (
                <div className="hidden sm:block size-8 shrink-0" />
              ))}
            </div>
          </div>
        );
      })}

      <Button
        type="button"
        variant="outline"
        disabled={passengers.length >= 200}
        onClick={() => addPassenger?.()}
        className="gap-2 px-3.5 w-fit h-9 text-[12px] font-medium rounded-md mt-1"
      >
        <Plus className="size-3.5" />
        Add Passenger
      </Button>
    </div>
  );
}
