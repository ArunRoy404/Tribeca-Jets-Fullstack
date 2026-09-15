"use client";

import Link from "next/link";
import { Building2, ArrowRight } from "lucide-react";
import SectionCard from "@/components/common/SectionCard";
import DetailField from "@/components/common/DetailField";

export default function AircraftOverviewTab({ aircraft }) {
  if (!aircraft) return null;

  const tripStats = aircraft.tripStats || {
    totalTrips: aircraft.trips || 12,
    thisYear: aircraft.trips || 12,
    avgUtilization: "68%",
  };

  const amenities = aircraft.amenities || [
    "WiFi",
    "Satellite Phone",
    "Full Galley",
    "Private Lavatory",
    "Lie-flat Seats",
    "Entertainment System",
    "Power Outlets",
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
      {/* Left Column (2/3 width) */}
      <div className="flex-1 flex flex-col gap-6 w-full min-w-0">
        {/* Specifications Card */}
        <SectionCard title="SPECIFICATIONS">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <DetailField label="Manufacturer" value={aircraft.manufacturer || "Gulfstream Aerospace"} />
            <DetailField label="Model Year" value={aircraft.modelYear || aircraft.year || "2019"} />
            <DetailField label="Max Passengers" value={aircraft.maxPassengers || aircraft.paxCount || "14"} />
            <DetailField label="Max Range" value={aircraft.maxRange || `${aircraft.rangeNm} nm`} />
            <DetailField label="Max Speed" value={aircraft.maxSpeed || "Mach 0.885"} />
            <DetailField label="Service Ceiling" value={aircraft.serviceCeiling || "51,000 ft"} />
            <DetailField label="Baggage Capacity" value={aircraft.baggageCapacity || "226 cu ft"} />
            <DetailField label="Cabin Length" value={aircraft.cabinLength || "50.1 ft"} />
          </div>
        </SectionCard>

        {/* Interior & Amenities Card */}
        <SectionCard title="INTERIOR & AMENITIES">
          <div className="flex flex-wrap gap-2 w-full">
            {amenities.map((am) => (
              <span
                key={am}
                className="px-3 py-1.5 rounded-sm bg-secondary border border-border font-montserrat text-[13px] font-bold text-foreground"
              >
                {am}
              </span>
            ))}
          </div>
        </SectionCard>

        {/* Notes Card */}
        <SectionCard title="NOTES">
          <p className="font-montserrat font-medium text-[14px] text-foreground leading-relaxed">
            {aircraft.notes || "WiFi available. Premium interior configuration. Gogo ATG-5000."}
          </p>
        </SectionCard>
      </div>

      {/* Right Column (1/3 width stacked) */}
      <div className="w-full lg:w-96 shrink-0 flex flex-col gap-6">
        {/* Operator Card */}
        <SectionCard title="OPERATOR">
          <div className="flex flex-col gap-3 w-full">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-purple/10 border border-purple/20 flex items-center justify-center text-purple shrink-0">
                <Building2 className="size-5" />
              </div>
              <span className="font-montserrat font-bold text-[18px] text-purple">{aircraft.operator}</span>
            </div>
            <Link
              href={`/dashboard/operators/${aircraft.operatorId || "OP-1003"}`}
              className="inline-flex items-center gap-1 font-montserrat text-[13px] font-bold text-purple hover:underline pt-1"
            >
              <span>View Operator</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </SectionCard>

        {/* Sidebar Interior & Amenities Card */}
        <SectionCard title="INTERIOR & AMENITIES">
          <div className="flex flex-wrap gap-2 w-full">
            {amenities.slice(0, 4).map((am) => (
              <span
                key={am}
                className="px-2.5 py-1 rounded-sm bg-secondary border border-border font-montserrat text-[12px] font-semibold text-foreground"
              >
                {am}
              </span>
            ))}
          </div>
        </SectionCard>

        {/* Trip Stats Card */}
        <SectionCard title="TRIP STATS">
          <div className="flex flex-col gap-3.5 w-full">
            <DetailField label="Total Trips" value={tripStats.totalTrips} />
            <DetailField label="This Year" value={tripStats.thisYear} />
            <DetailField label="Avg Utilization" value={tripStats.avgUtilization} />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
