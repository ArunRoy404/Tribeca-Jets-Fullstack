"use client";

import SectionCard from "@/components/common/SectionCard";
import StatusBadge from "@/components/common/StatusBadge";

export default function AircraftMaintenanceTab({ aircraft }) {
  if (!aircraft) return null;

  const schedule = aircraft.maintenanceSchedule || [
    { label: "Last 100-Hour Inspection", date: "2026-07-15", status: "Completed" },
    { label: "Last Annual", date: "2026-01-20", status: "Completed" },
    { label: "Next 100-Hour Due", date: "2026-09-15", status: "Scheduled" },
  ];

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="w-full max-w-xl">
        <SectionCard title="MAINTENANCE SCHEDULE">
          <div className="flex flex-col divide-y divide-secondary w-full">
            {schedule.map((item, index) => (
              <div key={index} className="flex items-center justify-between py-3.5 first:pt-1 last:pb-1 w-full">
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
