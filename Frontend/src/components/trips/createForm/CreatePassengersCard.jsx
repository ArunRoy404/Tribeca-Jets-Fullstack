"use client";

import { Minus, Plus, X } from "lucide-react";
import DetailCard from "@/components/trips/DetailCard";
import FormField from "@/components/trips/FormField";
import DatePicker from "@/components/common/DatePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateTripStore } from "@/store/useCreateTripStore";

/**
 * Passenger count and manifest. The count stepper directly controls manifest
 * capacity. Passenger 1 collects full details (DOB, Passport) while companion
 * passengers (2+) collect full name, matching the Figma workflow.
 */
export default function CreatePassengersCard() {
  const {
    passengerCount,
    passengers = [],
    setPassengerCount,
    addPassenger,
    removePassenger,
    updatePassenger,
  } = useCreateTripStore();

  const count = Math.max(1, Number(passengerCount) || passengers.length || 1);

  return (
    <DetailCard title="Passengers" description="Specify passenger count and optionally add names.">
      <FormField label="Passenger Count">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center rounded-md border border-input bg-background shadow-xs">
            <button
              type="button"
              onClick={() => setPassengerCount(count - 1)}
              disabled={count <= 1}
              className="flex size-9 items-center justify-center rounded-l-md border-r border-input text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
              aria-label="Decrease passenger count"
            >
              <Minus className="size-3.5" />
            </button>
            <span className="w-12 text-center font-montserrat font-semibold text-[14px] text-foreground select-none">
              {count}
            </span>
            <button
              type="button"
              onClick={() => setPassengerCount(count + 1)}
              disabled={count >= 200}
              className="flex size-9 items-center justify-center rounded-r-md border-l border-input text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
              aria-label="Increase passenger count"
            >
              <Plus className="size-3.5" />
            </button>
          </div>
          <span className="font-montserrat text-[12px] text-muted-foreground">
            Passenger names optional and can be added later.
          </span>
        </div>
      </FormField>

      <FormField label="Passenger Names (Optional)">
        <div className="flex flex-col gap-2.5">
          {passengers.map((p, index) => {
            const isLead = index === 0;

            if (isLead) {
              return (
                <div
                  key={p?.id ?? `p-${index}`}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-md border border-border p-2.5 sm:border-0 sm:p-0"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="flex items-center justify-center size-6 rounded-full bg-secondary font-montserrat font-semibold text-[11px] text-foreground shrink-0">
                      1
                    </span>
                    <Input
                      className="h-10 flex-1 min-w-0 rounded-md text-[13px]"
                      placeholder="Passenger 1 full name"
                      value={p?.fullName || ""}
                      onChange={(e) => updatePassenger?.(0, "fullName", e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                    <div className="sm:w-36">
                      <DatePicker
                        className="h-10 text-[13px] rounded-md"
                        value={p?.dateOfBirth}
                        onChange={(v) => updatePassenger?.(0, "dateOfBirth", v)}
                        placeholder="Date of Birth"
                      />
                    </div>
                    <Input
                      className="h-10 sm:w-32 rounded-md text-[13px]"
                      placeholder="Passport..."
                      value={p?.passportNumber || ""}
                      onChange={(e) => updatePassenger?.(0, "passportNumber", e.target.value)}
                    />
                  </div>
                </div>
              );
            }

            return (
              <div
                key={p?.id ?? `p-${index}`}
                className="flex items-center gap-2"
              >
                <span className="flex items-center justify-center size-6 rounded-full bg-secondary font-montserrat font-semibold text-[11px] text-foreground shrink-0">
                  {index + 1}
                </span>
                <Input
                  className="h-10 flex-1 min-w-0 rounded-md text-[13px]"
                  placeholder={`Passenger ${index + 1} full name`}
                  value={p?.fullName || ""}
                  onChange={(e) => updatePassenger?.(index, "fullName", e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => removePassenger?.(index)}
                  aria-label={`Remove passenger ${index + 1}`}
                  className="flex items-center justify-center size-8 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive cursor-pointer transition-colors"
                >
                  <X className="size-4" />
                </button>
              </div>
            );
          })}

          <Button
            type="button"
            variant="outline"
            onClick={() => addPassenger?.()}
            className="gap-2 px-3.5 w-fit h-9 text-[12px] font-medium rounded-md mt-1"
          >
            <Plus className="size-3.5" />
            Add Passenger
          </Button>
        </div>
      </FormField>
    </DetailCard>
  );
}

