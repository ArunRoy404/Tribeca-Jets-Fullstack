"use client";

import DetailCard from "@/components/common/DetailCard";
import DetailField from "@/components/common/DetailField";

/**
 * AircraftSpecsTab
 *
 * Full specification sheet for the aircraft.
 * Renders technical weights, speeds, and performance metrics from the database record.
 */
export default function AircraftSpecsTab({ aircraft }) {
  if (!aircraft) return null;

  return (
    <div className="flex flex-col gap-6 w-full">
      <DetailCard title="SPECIFICATIONS">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
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
      </DetailCard>
    </div>
  );
}
