"use client";

import SectionCard from "@/components/common/SectionCard";
import DetailField from "@/components/common/DetailField";

/**
 * The full specification sheet.
 *
 * Nine fields, each rendered exactly as stored. Every one of them used to
 * carry a fallback ("96,000 lb", "6,325 gal", "Mach 0.885"), so an aircraft
 * with no specification on file displayed a complete and entirely fictional
 * one — which is the number a broker would then quote against.
 */
export default function AircraftSpecsTab({ aircraft }) {
  if (!aircraft) return null;

  return (
    <div className="flex flex-col gap-6 w-full">
      <SectionCard title="SPECIFICATIONS">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full">
          <DetailField label="Max Takeoff Weight" value={aircraft.maxTakeoffWeight} />
          <DetailField label="Empty Weight" value={aircraft.emptyWeight} />
          <DetailField label="Fuel Capacity" value={aircraft.fuelCapacity} />

          <DetailField label="Max Speed" value={aircraft.maxSpeed} />
          <DetailField label="Cruise Speed" value={aircraft.cruiseSpeed} />
          <DetailField label="Range" value={aircraft.range} />

          <DetailField label="Service Ceiling" value={aircraft.serviceCeiling} />
          <DetailField label="Takeoff Distance" value={aircraft.takeoffDistance} />
          <DetailField label="Landing Distance" value={aircraft.landingDistance} />
        </div>
      </SectionCard>
    </div>
  );
}
