"use client";

import StatCard from "@/components/common/StatCard";

/**
 * AircraftDetailStats
 *
 * Displays 5 KPI tiles for the aircraft record.
 * Follows the CRM rule: "Never display a number the data did not supply".
 * `totalTrips` is null until Trips module (#11) is connected, and renders honest "—".
 */
export default function AircraftDetailStats({ aircraft }) {
  if (!aircraft) return null;

  const tailNumber = aircraft.tailNumber || "—";
  const category = aircraft.category && aircraft.category !== "—" ? aircraft.category : "—";
  const capacity = aircraft.maxPassengers && aircraft.maxPassengers !== "—" ? aircraft.maxPassengers : "—";
  const range = aircraft.range && aircraft.range !== "—" ? aircraft.range : "—";
  const totalTrips = aircraft.totalTrips && aircraft.totalTrips !== "—" ? String(aircraft.totalTrips) : "—";

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 items-stretch justify-center w-full">
      {/* 1. Tail Number */}
      <StatCard
        title="TAIL NUMBER"
        value={tailNumber}
        valueTone="purple"
      />

      {/* 2. Category */}
      <StatCard
        title="CATEGORY"
        value={category}
      />

      {/* 3. Capacity */}
      <StatCard
        title="CAPACITY"
        value={capacity}
      />

      {/* 4. Range */}
      <StatCard
        title="RANGE"
        value={range}
        valueTone="success"
      />

      {/* 5. Total Trips */}
      <StatCard
        title="TOTAL TRIPS"
        value={totalTrips}
        valueTone={totalTrips !== "—" ? "purple" : "foreground"}
        className="col-span-2 sm:col-span-1"
      />
    </div>
  );
}
