"use client";

import { Minus, Plus } from "lucide-react";
import PassengerManifestFields from "@/components/trips/passengers/PassengerManifestFields";
import DetailCard from "@/components/trips/DetailCard";
import FormField from "@/components/trips/FormField";
import { useCreateTripStore } from "@/store/useCreateTripStore";

/**
 * Passenger count and manifest. The count stepper directly controls manifest
 * capacity. All passengers collect full name, optional Date of Birth, and
 * Passport number and weight in lb.
 */
export default function CreatePassengersCard() {
  const {
    clientId,
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
        <PassengerManifestFields
          clientId={clientId}
          passengers={passengers}
          updatePassenger={updatePassenger}
          removePassenger={removePassenger}
          addPassenger={addPassenger}
        />
      </FormField>
    </DetailCard>
  );
}

