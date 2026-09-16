"use client";

import {
  AlertTriangle,
  Plane,
  Calendar,
  ExternalLink,
} from "lucide-react";
import StatusBadge from "@/components/common/StatusBadge";
import DetailCard from "@/components/common/DetailCard";
import ClientFollowUpBanner from "@/components/clients/ClientFollowUpBanner";

export default function ClientOverviewTab({ client, onScheduleFollowUp, onSwitchToActivity }) {
  if (!client) return null;

  const routes = client.preferences?.preferredRoutes ?? [];
  const airports = client.preferences?.preferredAirports ?? [];
  const aircraft = client.preferences?.preferredAircraft ?? [];
  const notes = client.notes || "No internal notes on file.";
  const hasFollowUp = Boolean(client.nextFollowUpAt);

  return (
    <DetailCard className="gap-6 p-4 sm:p-6">
      {/* Preferred Routes & Aircraft */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-border/40 w-full">
        <div className="flex flex-col gap-2">
          <span className="font-montserrat text-[11px] text-muted-foreground uppercase font-medium">
            Preferred Routes
          </span>
          {airports.length > 0 ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              {airports.map((ap) => (
                <span
                  key={ap}
                  className="px-2 py-0.5 rounded bg-secondary text-foreground font-montserrat font-semibold text-[11px] border border-border"
                >
                  {ap}
                </span>
              ))}
            </div>
          ) : null}
          <div className="font-montserrat font-bold text-[13px] text-foreground mt-0.5">
            {routes.length > 0 ? routes.join(", ") : "—"}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="font-montserrat text-[11px] text-muted-foreground uppercase font-medium">
            Preferred Aircraft
          </span>
          {aircraft.length > 0 ? (
            <div className="flex flex-col gap-1.5 text-[12px] font-montserrat">
              {aircraft.map((ac) => (
                <div key={ac} className="flex items-center gap-2 text-muted-foreground">
                  <Plane className="size-3.5 text-purple shrink-0" />
                  <span className="font-medium text-foreground">{ac}</span>
                </div>
              ))}
            </div>
          ) : (
            <span className="font-montserrat text-[12px] text-muted-foreground">—</span>
          )}
        </div>
      </div>

      {/* Recent Trip & Next Follow-up Sub-cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
        {/*
          TODO [API Integration - Trips Module]:
          Query the client's latest trip (e.g. GET /api/trips?clientId={client.id}&limit=1&sort=-departureTime).
          When Trips API lands:
          - route: `${trip.fromCode} → ${trip.toCode}`
          - departure & aircraft: `${formatDate(trip.departureTime)} • ${trip.aircraft?.name}`
          - id: `#${trip.id}`
          - status: trip.status
          Until then, render an honest empty placeholder ("No trips on file").
        */}
        <div className="p-4 bg-secondary/30 border border-border rounded-lg flex flex-col gap-2 justify-between">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="font-montserrat text-[11px] text-muted-foreground uppercase font-medium">
                Recent Trip
              </span>
              <h4 className="font-montserrat font-bold text-[14px] text-foreground">
                No trips on file
              </h4>
              <p className="font-montserrat text-[11px] text-muted-foreground">
                No trip records associated with this client.
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-warning/5 border border-warning/30 rounded-lg flex flex-col gap-2 justify-between">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5 font-montserrat font-bold text-[12px] text-warning">
                <Calendar className="size-3.5" />
                Next Follow-up
              </div>
              <p className="font-montserrat font-bold text-[13px] text-foreground">
                {hasFollowUp ? client.nextFollowUpLabel : "No follow-up scheduled"}
              </p>
              <p className="font-montserrat text-[11px] text-muted-foreground">
                {hasFollowUp
                  ? client.followUpNote || "No note on file"
                  : "Click Schedule Follow-up to set a reminder."}
              </p>
            </div>
            {hasFollowUp && client.followUpWindowLabel && client.followUpWindowLabel !== "—" && (
              <StatusBadge status={client.followUpWindowLabel} bordered />
            )}
          </div>
        </div>
      </div>

      {/* Important Notes Banner */}
      <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg flex items-start gap-3 w-full">
        <AlertTriangle className="size-5 text-warning shrink-0 mt-0.5" />
        <div className="flex flex-col gap-1">
          <h4 className="font-montserrat font-bold text-[13px] text-foreground">Important Notes</h4>
          <p className="font-montserrat text-[12px] text-foreground/90 leading-relaxed">
            {notes}
          </p>
        </div>
      </div>

      {/*
        TODO [API Integration - Activity Module]:
        Fetch recent client activity (e.g. GET /api/clients/{client.id}/activity?limit=4).
        Expected event shape: { id, user, action, time, type }
        Until then, render an honest empty state rather than hardcoded dummy events.
      */}
      <div className="flex flex-col gap-3 pt-2 w-full">
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <h3 className="font-montserrat font-bold text-[15px] text-foreground">Recent Activity</h3>
          <button
            type="button"
            onClick={onSwitchToActivity}
            className="font-montserrat text-[12px] text-purple font-semibold flex items-center gap-1 hover:underline cursor-pointer"
          >
            View all activity <ExternalLink className="size-3" />
          </button>
        </div>

        <div className="py-4 text-center sm:text-left">
          <p className="font-montserrat text-[12px] text-muted-foreground">
            No recent activity recorded for this client.
          </p>
        </div>
      </div>

      {/* Follow-up Banner inside the same container */}
      <ClientFollowUpBanner
        date={hasFollowUp ? client.nextFollowUpLabel : "—"}
        note={hasFollowUp ? client.followUpNote || "Follow-up due" : "No follow-up scheduled"}
        status={hasFollowUp ? client.followUpWindowLabel : "None"}
        onScheduleFollowUp={onScheduleFollowUp}
      />
    </DetailCard>
  );
}
