"use client";

import SectionCard from "@/components/common/SectionCard";
import StatusBadge from "@/components/common/StatusBadge";

/**
 * The three maintenance dates, with a badge derived from each.
 *
 * `toMaintenanceSchedule` returns only the dates that exist and computes
 * Completed / Scheduled / Overdue from the date itself — a stored status goes
 * stale the day it passes, and an overdue inspection still reading "Scheduled"
 * is exactly the kind of wrong answer that matters here.
 *
 * The three rows used to be hardcoded, so every aircraft in the fleet showed
 * the same inspection dates whether or not anyone had logged one.
 */
export default function AircraftMaintenanceTab({ aircraft }) {
  if (!aircraft) return null;

  const schedule = aircraft.maintenance ?? [];

  if (schedule.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-md border border-border w-full">
        <p className="font-montserrat font-bold text-[16px] text-foreground">
          No Maintenance Logged
        </p>
        <p className="font-montserrat text-[13px] text-muted-foreground mt-1">
          Inspection dates appear here once they are recorded. Edit the aircraft
          to add them.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="w-full max-w-xl">
        <SectionCard title="MAINTENANCE SCHEDULE">
          <div className="flex flex-col divide-y divide-secondary w-full">
            {schedule.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between gap-3 py-3.5 first:pt-1 last:pb-1 w-full"
              >
                <span className="font-montserrat text-[13px] text-muted-foreground">
                  {item.label}
                </span>
                <span className="font-montserrat font-bold text-[14px] text-foreground">
                  {item.date}
                </span>
                <StatusBadge status={item.status} bordered />
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
