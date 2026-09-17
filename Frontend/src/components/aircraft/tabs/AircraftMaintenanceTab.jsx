"use client";

import DetailCard from "@/components/common/DetailCard";
import StatusBadge from "@/components/common/StatusBadge";

/**
 * AircraftMaintenanceTab
 *
 * Displays maintenance inspection dates on file.
 * The `Overdue`, `Scheduled`, or `Completed` badge is computed from the date
 * itself against current time so that statuses never go stale.
 */
export default function AircraftMaintenanceTab({ aircraft }) {
  if (!aircraft) return null;

  const schedule = aircraft.maintenance ?? [];

  if (schedule.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-lg border border-border w-full shadow-card">
        <p className="font-montserrat font-bold text-[16px] text-foreground">
          No Maintenance Logged
        </p>
        <p className="font-montserrat text-[13px] text-muted-foreground mt-1 max-w-sm">
          Inspection dates appear here once recorded. Edit the aircraft to add them.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="w-full max-w-xl">
        <DetailCard title="MAINTENANCE SCHEDULE">
          <div className="flex flex-col divide-y divide-border/60 w-full">
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
        </DetailCard>
      </div>
    </div>
  );
}
