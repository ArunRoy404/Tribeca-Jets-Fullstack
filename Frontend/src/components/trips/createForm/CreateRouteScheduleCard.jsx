"use client";

import { Plus, Trash2 } from "lucide-react";
import DetailCard from "@/components/trips/DetailCard";
import FormField from "@/components/trips/FormField";
import AirportPicker from "@/components/airports/AirportPicker";
import DatePicker from "@/components/common/DatePicker";
import TimePicker from "@/components/common/TimePicker";
import { Button } from "@/components/ui/button";
import { useCreateTripStore } from "@/store/useCreateTripStore";

function LegFields({ leg, index, route = true, onChange }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {route && (
        <>
          <FormField label="Departure Airport">
            <AirportPicker
              value={leg?.originAirportId}
              onChange={(v) => onChange(index, "originAirportId", v || "")}
              placeholder="Select departure airport..."
            />
          </FormField>
          <FormField label="Arrival Airport">
            <AirportPicker
              value={leg?.destinationAirportId}
              onChange={(v) => onChange(index, "destinationAirportId", v || "")}
              placeholder="Select arrival airport..."
            />
          </FormField>
        </>
      )}
      <FormField label="Departure Date (Optional)">
        <DatePicker value={leg?.departureDate} onChange={(v) => onChange(index, "departureDate", v)} placeholder="Choose Date" />
      </FormField>
      <FormField label="Departure Time, local (Optional)">
        <TimePicker value={leg?.departureTime} onChange={(v) => onChange(index, "departureTime", v)} placeholder="Choose Time" />
      </FormField>
    </div>
  );
}

/**
 * The route. One-way and round trip ask for the outbound; a round trip's
 * return is the outbound reversed, so it asks only when. Multi-leg lists every
 * leg. Times are local at the departure airport — how a charter is quoted.
 */
export default function CreateRouteScheduleCard() {
  const { type, legs, updateLeg, addLeg, removeLeg } = useCreateTripStore();

  return (
    <DetailCard title="Route & Schedule" description="Departure, arrival and timing. Times are local at the departure airport.">
      {type !== "MULTI_LEG" ? (
        <div className="flex flex-col gap-4">
          <LegFields leg={legs?.[0]} index={0} onChange={updateLeg} />
          {type === "ROUND_TRIP" && (
            <div className="flex flex-col gap-2 pt-2 border-t border-border">
              <p className="font-montserrat font-semibold text-[13px] text-foreground">Return — the same route in reverse</p>
              <LegFields leg={legs?.[1]} index={1} route={false} onChange={updateLeg} />
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col rounded-sm border border-border divide-y divide-border">
            {legs?.map((leg, index) => (
              <div key={leg?.id ?? `new-${index}`} className="flex flex-col gap-4 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-montserrat font-semibold text-[13px] text-foreground">Leg {index + 1}</p>
                  {legs.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeLeg?.(index)}
                      className="flex items-center gap-1 font-montserrat font-semibold text-[12px] text-destructive cursor-pointer"
                    >
                      <Trash2 className="size-3.5" />
                      Remove
                    </button>
                  )}
                </div>
                <LegFields leg={leg} index={index} onChange={updateLeg} />
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" onClick={() => addLeg?.()} className="gap-2 px-4 w-fit">
            <Plus className="size-3.5" />
            Add Leg
          </Button>
        </div>
      )}
    </DetailCard>
  );
}

