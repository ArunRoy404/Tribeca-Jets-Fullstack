"use client";

import { Minus, Plus, X } from "lucide-react";
import DetailCard from "@/components/trips/DetailCard";
import FormField from "@/components/trips/FormField";
import DatePicker from "@/components/common/DatePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateTripStore } from "@/store/useCreateTripStore";

export default function CreatePassengersCard() {
  const state = useCreateTripStore();
  const {
    passengerCount,
    passengerNames = [],
    setPassengerCount,
    addPassenger,
    removePassenger,
    updatePassenger,
  } = state || {};

  return (
    <DetailCard title="Passengers" description="Specify passenger count and optionally add names.">
      <FormField label="Passenger Count">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setPassengerCount?.(-1)}
            className="flex items-center justify-center size-8 rounded-sm border border-border cursor-pointer hover:bg-muted"
          >
            <Minus className="size-3.5" />
          </button>
          <span className="font-montserrat font-bold text-[16px] text-foreground w-6 text-center">{passengerCount ?? 0}</span>
          <button
            type="button"
            onClick={() => setPassengerCount?.(1)}
            className="flex items-center justify-center size-8 rounded-sm border border-border cursor-pointer hover:bg-muted"
          >
            <Plus className="size-3.5" />
          </button>
          <p className="font-montserrat text-[12px] text-muted-foreground">Passenger names are optional and can be added later.</p>
        </div>
      </FormField>

      <FormField label="Passenger Names (optional)">
        <div className="flex flex-col gap-2">
          {passengerNames?.map((p, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="flex items-center justify-center size-6 rounded-full bg-secondary font-montserrat text-[11px] text-foreground shrink-0">
                {index + 1}
              </span>
              <Input
                className="h-9 flex-1 min-w-0 rounded-sm"
                placeholder={`Passenger ${index + 1} full name`}
                value={p?.name || ""}
                onChange={(e) => updatePassenger?.(index, "name", e.target.value)}
              />
              <div className="w-36 shrink-0 hidden sm:block">
                <DatePicker
                  className="h-9 text-[12px]"
                  value={p?.dob}
                  onChange={(v) => updatePassenger?.(index, "dob", v)}
                  placeholder="DOB"
                />
              </div>
              <Input
                className="h-9 w-28 shrink-0 rounded-sm hidden sm:block"
                placeholder="Passport..."
                value={p?.passport || ""}
                onChange={(e) => updatePassenger?.(index, "passport", e.target.value)}
              />
              <button
                type="button"
                onClick={() => removePassenger?.(index)}
                className="flex items-center justify-center size-6 shrink-0 cursor-pointer text-muted-foreground hover:text-destructive"
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
          <Button variant="outline" onClick={() => addPassenger?.()} className="gap-2 px-4 w-fit">
            <Plus className="size-3.5" />
            Add Passenger
          </Button>
        </div>
      </FormField>
    </DetailCard>
  );
}
