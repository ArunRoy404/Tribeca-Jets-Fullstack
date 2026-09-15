"use client";

import SectionCard from "@/components/common/SectionCard";
import DetailField from "@/components/common/DetailField";

export default function AircraftSpecsTab({ aircraft }) {
  if (!aircraft) return null;

  return (
    <div className="flex flex-col gap-6 w-full">
      <SectionCard title="SPECIFICATIONS">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full">
          {/* Row 1 */}
          <DetailField label="Max Takeoff Weight" value={aircraft.maxTakeoffWeight || "96,000 lb"} />
          <DetailField label="Empty Weight" value={aircraft.emptyWeight || "48,300 lb"} />
          <DetailField label="Fuel Capacity" value={aircraft.fuelCapacity || "6,325 gal"} />

          {/* Row 2 */}
          <DetailField label="Max Speed" value={aircraft.maxSpeed || "Mach 0.885"} />
          <DetailField label="Cruise Speed" value={aircraft.cruiseSpeed || "Mach 0.80"} />
          <DetailField label="Range" value={aircraft.maxRange || `${aircraft.rangeNm} nm`} />

          {/* Row 3 */}
          <DetailField label="Service Ceiling" value={aircraft.serviceCeiling || "51,000 ft"} />
          <DetailField label="Takeoff Distance" value={aircraft.takeoffDistance || "5,900 ft"} />
          <DetailField label="Landing Distance" value={aircraft.landingDistance || "2,776 ft"} />
        </div>
      </SectionCard>
    </div>
  );
}
