"use client";

import DetailCard from "@/components/trips/DetailCard";
import FormField from "@/components/trips/FormField";
import PickerSelect from "@/components/trips/PickerSelect";
import { Input } from "@/components/ui/input";
import { useCreateTripStore } from "@/store/useCreateTripStore";
import { cn } from "@/lib/utils";

/**
 * Operator and aircraft as real links. A tail not in the fleet is described
 * in free text instead — the same split quotes make — and the text box steps
 * aside once a fleet aircraft is chosen, since the two would contradict.
 */
export default function CreateAircraftOperatorCard({ options }) {
  const { operatorId, aircraftId, aircraftDescription, operatorConfirmed, setField } = useCreateTripStore();

  // The operator's own tails first, when one is chosen.
  const aircraftOptions = operatorId
    ? [...(options?.aircraft ?? [])].sort((a, b) => (b.operatorId === operatorId) - (a.operatorId === operatorId))
    : options?.aircraft;

  return (
    <DetailCard title="Aircraft & Operator" description="Assign the operator and aircraft for this trip.">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Operator (Optional)">
          <PickerSelect value={operatorId} onChange={(v) => setField?.("operatorId", v)} options={options?.operators} placeholder="Select operator..." />
        </FormField>
        <FormField label="Fleet Aircraft (Optional)">
          <PickerSelect value={aircraftId} onChange={(v) => setField?.("aircraftId", v)} options={aircraftOptions} placeholder="Select a tail..." />
        </FormField>
        {!aircraftId && (
          <FormField label="Or describe it (Optional)">
            <Input
              className="h-10 rounded-sm"
              placeholder="e.g. Challenger 350 — not in the fleet"
              value={aircraftDescription || ""}
              onChange={(e) => setField?.("aircraftDescription", e.target.value)}
            />
          </FormField>
        )}
        <FormField label="Operator Confirmation">
          <div className="flex w-full rounded-sm border border-border overflow-hidden">
            {[
              { value: false, label: "Pending" },
              { value: true, label: "Confirmed" },
            ].map((option) => (
              <button
                type="button"
                key={option.label}
                onClick={() => setField?.("operatorConfirmed", option.value)}
                className={cn(
                  "flex-1 py-2 text-center font-montserrat text-[13px] cursor-pointer",
                  operatorConfirmed === option.value
                    ? option.value
                      ? "bg-success/15 text-success font-semibold"
                      : "bg-warning/15 text-warning font-semibold"
                    : "bg-secondary text-muted-foreground"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </FormField>
      </div>
    </DetailCard>
  );
}
