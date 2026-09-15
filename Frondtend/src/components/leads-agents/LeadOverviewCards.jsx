"use client";

import { Activity, Clock } from "lucide-react";
import SectionCard from "@/components/common/SectionCard";
import DetailField from "@/components/common/DetailField";

export default function LeadOverviewCards({ lead }) {
  if (!lead) return null;

  const activities = lead.activities || [];

  return (
    <div className="flex flex-col gap-6 w-full min-w-0">
      {/* Contact Card */}
      <SectionCard title="Contact" className="bg-white">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          <DetailField label="Name" value={lead.name} />
          <DetailField label="Company" value={lead.company} />
          <DetailField label="Email" value={lead.email} valueClassName="truncate" />
          <DetailField label="Phone" value={lead.phone} />
        </div>
      </SectionCard>

      {/* Trip Interest Card */}
      <SectionCard title="Trip Interest" className="bg-white">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          <DetailField label="Route" value={lead.route || `${lead.origin} → ${lead.destination}`} />
          <DetailField label="Departure" value={lead.departureDate || "Aug 15, 2026"} />
          <DetailField label="Return" value={lead.returnDate || "Aug 17, 2026"} />
          <DetailField label="Passengers" value={lead.passengers || "4 pax"} />
          <DetailField label="Aircraft" value={lead.aircraftPreference || "Heavy Jet"} />
          <DetailField
            label="Notes"
            value={lead.tripNotes || "Needs catering and ground transport."}
          />
        </div>
      </SectionCard>

      {/* Activity Timeline Card */}
      <SectionCard title="Activity Timeline" className="bg-white">
        <div className="flex flex-col gap-3.5 w-full">
          {activities.map((item) => (
            <div key={item.id} className="flex items-start gap-3 w-full">
              <div className="size-8 rounded-full bg-secondary text-foreground flex items-center justify-center shrink-0 border border-border mt-0.5">
                <Activity className="size-4 text-purple" />
              </div>
              <div className="flex flex-col gap-1 min-w-0 flex-1 border-b border-border/40 pb-3">
                <p className="font-montserrat font-semibold text-[13px] text-foreground leading-snug">
                  {item.title}
                </p>
                <div className="flex items-center gap-1.5 font-montserrat text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3 text-muted-foreground" />
                    <span>{item.timestamp}</span>
                  </span>
                  {item.author && (
                    <>
                      <span>•</span>
                      <span className="font-medium text-foreground">{item.author}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}

          {activities.length === 0 && (
            <div className="p-4 text-center text-muted-foreground font-montserrat text-[13px]">
              No activity logs recorded.
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}

