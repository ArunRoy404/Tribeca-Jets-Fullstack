"use client";

import { cn } from "@/lib/utils";

function StatCard({ label, value, subtitle, valueColor }) {
  return (
    <div className="p-4 bg-white border border-border rounded-lg shadow-card flex flex-col gap-1 min-w-0">
      <span className="font-montserrat text-[11px] text-muted-foreground uppercase font-medium truncate">
        {label}
      </span>
      <span
        className={cn(
          "font-montserrat font-bold text-[20px] sm:text-[22px] truncate",
          valueColor || "text-foreground"
        )}
      >
        {value}
      </span>
      {subtitle && (
        <span className="font-montserrat text-[11px] text-muted-foreground truncate">
          {subtitle}
        </span>
      )}
    </div>
  );
}

export default function ClientStatsRow({ client }) {
  // Uses API values if available, otherwise falls back to Figma hardcoded preview values
  const totalTrips = client?.totalTrips || "18";
  const tripsOnRecord = client?.tripsOnRecord || "6 on record";
  const totalSpent = client?.totalSpent || "$485,000";
  const activeQuotes = client?.activeQuotesCount || "1";
  const nextFollowUp = client?.nextFollowUpLabel || "Aug 12, 2026";
  const followUpStatus = client?.followUpWindowLabel || "Upcoming";

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full">
      <StatCard
        label="Total Trips"
        value={totalTrips}
        subtitle={tripsOnRecord}
      />
      <StatCard
        label="Total Spent"
        value={totalSpent}
        subtitle="all time"
        valueColor="text-success"
      />
      <StatCard
        label="Active Quotes"
        value={activeQuotes}
        subtitle="awaiting response"
        valueColor="text-destructive"
      />
      <StatCard
        label="Next Follow-up"
        value={nextFollowUp}
        subtitle={followUpStatus}
        valueColor="text-warning"
      />
    </div>
  );
}
