"use client";

import { Plus, X } from "lucide-react";
import DetailCard from "@/components/trips/DetailCard";
import FormField from "@/components/trips/FormField";
import DatePicker from "@/components/common/DatePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateTripStore } from "@/store/useCreateTripStore";

/**
 * How many are flying, and — usually later — who. The count and the names are
 * separate because the names arrive days after the booking; nothing is
 * pre-filled, so an empty manifest is honestly empty.
 */
export default function CreatePassengersCard() {
  const { passengerCount, passengers = [], setField, addPassenger, removePassenger, updatePassenger } = useCreateTripStore();

  return (
    <DetailCard title="Passengers" description="How many are flying, and names when you have them.">
      <FormField label="Passenger Count (Optional)">
        <Input
          type="number"
          min="1"
          max="200"
          className="h-10 w-32 rounded-sm"
          placeholder="e.g. 4"
          value={passengerCount}
          onChange={(e) => setField?.("passengerCount", e.target.value)}
        />
      </FormField>

      <FormField label="Named Passengers (Optional)">
        <div className="flex flex-col gap-2">
          {passengers.length === 0 && (
            <p className="font-montserrat text-[12px] text-muted-foreground">No names yet — they can be added later.</p>
          )}
          {passengers.map((p, index) => (
            <div key={p?.id ?? `new-${index}`} className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-sm border border-border p-2 sm:border-0 sm:p-0">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="flex items-center justify-center size-6 rounded-full bg-secondary font-montserrat text-[11px] text-foreground shrink-0">{index + 1}</span>
                <Input className="h-9 flex-1 min-w-0 rounded-sm" placeholder="Full name" value={p?.fullName || ""} onChange={(e) => updatePassenger?.(index, "fullName", e.target.value)} />
                <button type="button" onClick={() => removePassenger?.(index)} aria-label={`Remove passenger ${index + 1}`} className="flex items-center justify-center size-6 shrink-0 cursor-pointer text-muted-foreground hover:text-destructive sm:hidden">
                  <X className="size-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                <div className="sm:w-36">
                  <DatePicker className="h-9 text-[12px]" value={p?.dateOfBirth} onChange={(v) => updatePassenger?.(index, "dateOfBirth", v)} placeholder="Date of birth" />
                </div>
                <Input className="h-9 sm:w-32 rounded-sm" placeholder="Passport no." value={p?.passportNumber || ""} onChange={(e) => updatePassenger?.(index, "passportNumber", e.target.value)} />
              </div>
              <button type="button" onClick={() => removePassenger?.(index)} aria-label={`Remove passenger ${index + 1}`} className="hidden sm:flex items-center justify-center size-6 shrink-0 cursor-pointer text-muted-foreground hover:text-destructive">
                <X className="size-4" />
              </button>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={() => addPassenger?.()} className="gap-2 px-4 w-fit">
            <Plus className="size-3.5" />
            Add Passenger
          </Button>
        </div>
      </FormField>
    </DetailCard>
  );
}
