"use client";

import Link from "next/link";
import { Building2, ArrowRight } from "lucide-react";
import SectionCard from "@/components/common/SectionCard";
import DetailField from "@/components/common/DetailField";

/**
 * Every value below comes from the record, already formatted by
 * `toAircraftRow` — an absent one is an em dash.
 *
 * This tab used to fall back to "Gulfstream Aerospace", "Mach 0.885",
 * "51,000 ft", "226 cu ft" and a seven-item amenity list, so every aircraft in
 * the fleet displayed the specification of one G550 whether or not anybody had
 * entered it. It also linked to a hardcoded operator id, so "View Operator"
 * opened the same company from any tail.
 */
export default function AircraftOverviewTab({ aircraft }) {
  if (!aircraft) return null;

  const amenities = aircraft.amenities ?? [];

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
      <div className="flex-1 flex flex-col gap-6 w-full min-w-0">
        <SectionCard title="SPECIFICATIONS">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <DetailField label="Manufacturer" value={aircraft.manufacturer} />
            <DetailField label="Year Built" value={aircraft.yearBuilt} />
            <DetailField label="Max Passengers" value={aircraft.maxPassengers} />
            <DetailField label="Max Range" value={aircraft.range} />
            <DetailField label="Max Speed" value={aircraft.maxSpeed} />
            <DetailField label="Service Ceiling" value={aircraft.serviceCeiling} />
            <DetailField label="Baggage Capacity" value={aircraft.baggageCapacity} />
            <DetailField label="Cabin Length" value={aircraft.cabinLength} />
          </div>
        </SectionCard>

        <SectionCard title="INTERIOR & AMENITIES">
          {amenities.length ? (
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
        </SectionCard>

        <SectionCard title="NOTES">
          {aircraft.notes ? (
            <p className="font-montserrat font-medium text-[14px] text-foreground leading-relaxed">
              {aircraft.notes}
            </p>
          ) : (
            <p className="font-montserrat text-[13px] text-muted-foreground">
              No notes on file.
            </p>
          )}
        </SectionCard>
      </div>

      <div className="w-full lg:w-96 shrink-0 flex flex-col gap-6">
        <SectionCard title="OPERATOR">
          {aircraft.operatorId ? (
            <div className="flex flex-col gap-3 w-full">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-purple/10 border border-purple/20 flex items-center justify-center text-purple shrink-0">
                  <Building2 className="size-5" />
                </div>
                <span className="font-montserrat font-bold text-[18px] text-purple">
                  {aircraft.operator}
                </span>
              </div>
              {/* The real operator, not a hardcoded id. */}
              <Link
                href={`/dashboard/operators/${aircraft.operatorId}`}
                className="inline-flex items-center gap-1 font-montserrat text-[13px] font-bold text-purple hover:underline pt-1"
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
        </SectionCard>

        <SectionCard title="HOME BASE">
          {aircraft.homeBaseId ? (
            <Link
              href={`/dashboard/airports?search=${aircraft.homeBaseIcao ?? ""}`}
              className="font-montserrat font-bold text-[15px] text-purple hover:underline"
            >
              {aircraft.homeBase}
            </Link>
          ) : (
            <p className="font-montserrat text-[13px] text-muted-foreground">
              No home base on file.
            </p>
          )}
        </SectionCard>

        <SectionCard title="TRIP STATS">
          <div className="flex flex-col gap-3.5 w-full">
            {/* All three are null until the Trips module exists. They render as
                an em dash rather than 0, because "0 trips" against a tail the
                desk has flown is a wrong answer and "—" is an honest one. */}
            <DetailField label="Total Trips" value={aircraft.totalTrips} />
            <DetailField label="This Year" value={aircraft.tripsThisYear} />
            <DetailField label="Avg Utilization" value={aircraft.avgUtilization} />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
