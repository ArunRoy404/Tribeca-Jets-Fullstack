"use client";

import DetailCard from "@/components/trips/DetailCard";
import FormField from "@/components/trips/FormField";
import PickerSelect from "@/components/trips/PickerSelect";
import { Input } from "@/components/ui/input";
import { useCreateTripStore } from "@/store/useCreateTripStore";
import {
  operatorOptions,
  aircraftOptions,
} from "@/dummyData/createTripOptions";
import { cn } from "@/lib/utils";

export default function CreateAircraftOperatorCard() {
  const state = useCreateTripStore();
  const {
    operator,
    aircraftType,
    tailRegistration,
    operatorConfirmation,
    setField,
  } = state || {};

  return (
    <DetailCard title="Aircraft & Operator" description="Assign the operator and aircraft for this trip.">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Operator">
          <PickerSelect value={operator} onChange={(v) => setField?.("operator", v)} options={operatorOptions} placeholder="Select operator..." />
        </FormField>
        <FormField label="Aircraft">
          <PickerSelect value={aircraftType} onChange={(v) => setField?.("aircraftType", v)} options={aircraftOptions} placeholder="Select aircraft type..." />
        </FormField>
        <FormField label="Tail / Registration">
          <Input className="h-10 rounded-sm" placeholder="e.g. N550GJ" value={tailRegistration || ""} onChange={(e) => setField?.("tailRegistration", e.target.value)} />
        </FormField>
        <FormField label="Operator Confirmation">
          <div className="flex w-full rounded-sm border border-border overflow-hidden">
            {["Pending", "Confirmed"].map((option) => (
              <button
                type="button"
                key={option}
                onClick={() => setField?.("operatorConfirmation", option)}
                className={cn(
                  "flex-1 py-2 text-center font-montserrat text-[13px] cursor-pointer",
                  operatorConfirmation === option
                    ? option === "Pending"
                      ? "bg-warning/15 text-warning font-semibold"
                      : "bg-success/15 text-success font-semibold"
                    : "bg-secondary text-muted-foreground"
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </FormField>
      </div>
    </DetailCard>
  );
}
