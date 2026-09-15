"use client";

import { Search, UserPlus, Trash2 } from "lucide-react";
import DetailCard from "@/components/trips/DetailCard";
import FormField from "@/components/trips/FormField";
import IconInput from "@/components/common/IconInput";
import DatePicker from "@/components/common/DatePicker";
import TimePicker from "@/components/common/TimePicker";
import { Button } from "@/components/ui/button";
import { useCreateTripStore } from "@/store/useCreateTripStore";

export default function CreateRouteScheduleCard() {
  const state = useCreateTripStore();
  const {
    tripType,
    departureAirport,
    arrivalAirport,
    departureDate,
    departureTime,
    returnDate,
    returnTime,
    legs,
    setField,
    addLeg,
    removeLeg,
    updateLeg,
  } = state || {};

  return (
    <DetailCard title="Route & Schedule" description="Define departure, arrival, and flight timing.">
      {tripType !== "Multi Leg" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Departure Airport">
            <IconInput icon={Search} placeholder="Search airport or IATA code..." value={departureAirport || ""} onChange={(e) => setField?.("departureAirport", e.target.value)} />
          </FormField>
          <FormField label="Arrival Airport">
            <IconInput icon={Search} placeholder="Search airport or IATA code..." value={arrivalAirport || ""} onChange={(e) => setField?.("arrivalAirport", e.target.value)} />
          </FormField>
          <FormField label="Departure Date">
            <DatePicker value={departureDate} onChange={(v) => setField?.("departureDate", v)} placeholder="Choose Date" />
          </FormField>
          <FormField label="Departure Time">
            <TimePicker value={departureTime} onChange={(v) => setField?.("departureTime", v)} placeholder="Choose Time" />
          </FormField>
          {tripType === "Round Trip" && (
            <>
              <FormField label="Return Date">
                <DatePicker value={returnDate} onChange={(v) => setField?.("returnDate", v)} placeholder="Choose Date" />
              </FormField>
              <FormField label="Return Time">
                <TimePicker value={returnTime} onChange={(v) => setField?.("returnTime", v)} placeholder="Choose Time" />
              </FormField>
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="font-montserrat font-semibold text-[13px] text-foreground">Flight Legs</p>
          <div className="flex flex-col rounded-sm border border-border divide-y divide-border">
            {legs?.map((leg, index) => (
              <div key={index} className="flex flex-col gap-4 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-montserrat text-[13px] text-muted-foreground">Leg {index + 1}</p>
                  {index > 1 && (
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="Departure Airport">
                    <IconInput icon={Search} placeholder="Search airport or IATA code..." value={leg?.from || ""} onChange={(e) => updateLeg?.(index, "from", e.target.value)} />
                  </FormField>
                  <FormField label="Arrival Airport">
                    <IconInput icon={Search} placeholder="Search airport or IATA code..." value={leg?.to || ""} onChange={(e) => updateLeg?.(index, "to", e.target.value)} />
                  </FormField>
                  <FormField label="Departure Date">
                    <DatePicker value={leg?.date} onChange={(v) => updateLeg?.(index, "date", v)} placeholder="Choose Date" />
                  </FormField>
                  <FormField label="Departure Time">
                    <TimePicker value={leg?.time} onChange={(v) => updateLeg?.(index, "time", v)} placeholder="Choose Time" />
                  </FormField>
                </div>
              </div>
            ))}
          </div>
          <Button onClick={() => addLeg?.()} className="gap-2 px-4 w-fit">
            <UserPlus className="size-3.5" />
            Add Flight Leg
          </Button>
        </div>
      )}
    </DetailCard>
  );
}
