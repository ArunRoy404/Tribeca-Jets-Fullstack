"use client";

import Link from "next/link";
import { Building2, ArrowRight } from "lucide-react";
import DetailCard from "@/components/common/DetailCard";
import DetailField from "@/components/common/DetailField";

/**
 * AircraftOverviewTab
 *
 * Displays aircraft specifications, interior amenities, notes, operator details,
 * home base airport, and trip aggregates.
 * Follows the CRM rule: "Never display a number the data did not supply".
 */
export default function AircraftOverviewTab({ aircraft }) {
  if (!aircraft) return null;

  const amenities = aircraft.amenities ?? [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start w-full">
      {/* Left Column: Specifications, Interior & Amenities, Notes */}
      <div className="flex flex-col gap-6 w-full min-w-0">
        <DetailCard title="SPECIFICATIONS">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 w-full">
            <DetailField label="Manufacturer" value={aircraft.manufacturer} />
            <DetailField label="Year Built" value={aircraft.yearBuilt} />
            <DetailField label="Max Passengers" value={aircraft.maxPassengers} />
            <DetailField label="Max Range" value={aircraft.range} />
            <DetailField label="Max Speed" value={aircraft.maxSpeed} />
            <DetailField label="Service Ceiling" value={aircraft.serviceCeiling} />
            <DetailField label="Baggage Capacity" value={aircraft.baggageCapacity} />
            <DetailField label="Cabin Length" value={aircraft.cabinLength} />
          </div>
        </DetailCard>

        <DetailCard title="INTERIOR & AMENITIES">
          {amenities.length > 0 ? (
            <div className="flex flex-wrap gap-2 w-full">
              {amenities.map((amenity) => (
                <span
                  key={amenity}
                  className="px-3 py-1.5 rounded-sm bg-secondary border border-border font-montserrat text-[13px] font-bold text-foreground"
                >
                  {amenity}
                </span>
              ))}
            </div>
          ) : (
            <p className="font-montserrat text-[13px] text-muted-foreground">
              No amenities recorded for this aircraft.
            </p>
          )}
        </DetailCard>

        <DetailCard title="NOTES">
          {aircraft.notes ? (
            <p className="font-montserrat font-medium text-[13px] text-foreground leading-relaxed">
              {aircraft.notes}
            </p>
          ) : (
            <p className="font-montserrat text-[13px] text-muted-foreground">
              No notes on file.
            </p>
          )}
        </DetailCard>
      </div>

      {/* Right Column: Operator, Home Base, Trip Stats */}
      <div className="w-full shrink-0 flex flex-col gap-6 min-w-0">
        <DetailCard title="OPERATOR">
          {aircraft.operatorId ? (
            <div className="flex flex-col gap-3 w-full">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-purple/10 border border-purple/20 flex items-center justify-center text-purple shrink-0">
                  <Building2 className="size-5" />
                </div>
                <span className="font-montserrat font-bold text-[16px] text-purple truncate">
                  {aircraft.operator}
                </span>
              </div>
              <Link
                href={`/dashboard/operators/${aircraft.operatorId}`}
                className="inline-flex items-center gap-1 font-montserrat text-[12px] font-bold text-purple hover:underline pt-1"
              >
                <span>View Operator</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          ) : (
            <p className="font-montserrat text-[13px] text-muted-foreground">
              Unassigned. Edit the aircraft to link it to an operator.
            </p>
          )}
        </DetailCard>

        <DetailCard title="HOME BASE">
          {aircraft.homeBaseId ? (
            <Link
              href={`/dashboard/airports?search=${aircraft.homeBaseIcao ?? ""}`}
              className="font-montserrat font-bold text-[14px] text-purple hover:underline"
            >
              {aircraft.homeBase}
            </Link>
          ) : (
            <p className="font-montserrat text-[13px] text-muted-foreground">
              No home base on file.
            </p>
          )}
        </DetailCard>

        <DetailCard title="TRIP STATS">
          <div className="flex flex-col gap-3.5 w-full">
            {/* All three are null until the Trips module exists. They render as
                an em dash rather than 0, per the project agreement. */}
            <DetailField label="Total Trips" value={aircraft.totalTrips} />
            <DetailField label="This Year" value={aircraft.tripsThisYear} />
            <DetailField label="Avg Utilization" value={aircraft.avgUtilization} />
          </div>
        </DetailCard>
      </div>
    </div>
  );
}
