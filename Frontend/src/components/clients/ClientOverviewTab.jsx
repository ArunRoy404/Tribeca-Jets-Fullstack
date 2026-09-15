"use client";

import { AlertTriangle, Plane, CheckCircle2, DollarSign, FileText, Calendar, Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function ClientOverviewTab({ client, onScheduleFollowUp }) {
  if (!client) return null;

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Preferred Routes & Aircraft Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
        <div className="p-4 bg-white border border-border rounded-lg shadow-card flex flex-col gap-2">
          <span className="font-montserrat text-[11px] text-muted-foreground uppercase font-medium">Preferred Routes</span>
          <div className="font-montserrat font-bold text-[13px] text-foreground">
            {client.prefAirports || "KTEB → KMIA"}
          </div>
        </div>
        <div className="p-4 bg-white border border-border rounded-lg shadow-card flex flex-col gap-2">
          <span className="font-montserrat text-[11px] text-muted-foreground uppercase font-medium">Preferred Aircraft</span>
          <div className="flex flex-col gap-1 text-[12px] font-montserrat">
            {(client.preferredAircraft || ["Gulfstream G550", "Global 6000"]).map((ac) => (
              <div key={ac} className="flex items-center gap-1.5 text-muted-foreground">
                <Plane className="size-3.5 text-purple shrink-0" />
                <span className="font-medium text-foreground">{ac}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Trip & Next Follow-up Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
        <div className="p-4 bg-secondary/30 border border-border rounded-lg flex flex-col gap-2 justify-between">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="font-montserrat text-[11px] text-muted-foreground uppercase font-medium">Recent Trip</span>
              <h4 className="font-montserrat font-bold text-[14px] text-foreground">
                Miami <span className="text-muted-foreground font-normal">→</span> Los Angeles
              </h4>
              <p className="font-montserrat text-[11px] text-muted-foreground">Aug 9, 2026 • Gulfstream G550</p>
              <span className="font-montserrat font-bold text-[11px] text-purple">#TJ-1048</span>
            </div>
            <Badge tone="info" size="sm" className="font-bold text-[10px]">
              Confirmed
            </Badge>
          </div>
        </div>

        <div className="p-4 bg-warning/5 border border-warning/30 rounded-lg flex flex-col gap-2 justify-between">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5 font-montserrat font-bold text-[12px] text-warning">
                <Calendar className="size-3.5" />
                Next Follow-up
              </div>
              <p className="font-montserrat font-bold text-[13px] text-foreground">Aug 12, 2026</p>
              <p className="font-montserrat text-[11px] text-muted-foreground">
                Check availability for Miami → New York round trip in September
              </p>
            </div>
            <Badge tone="info" size="sm" className="font-bold text-[10px]">
              Upcoming
            </Badge>
          </div>
        </div>
      </div>

      {/* Important Notes Warning Banner */}
      <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg flex items-start gap-3 w-full">
        <AlertTriangle className="size-5 text-warning shrink-0 mt-0.5" />
        <div className="flex flex-col gap-1">
          <h4 className="font-montserrat font-bold text-[13px] text-foreground">Important Notes</h4>
          <p className="font-montserrat text-[12px] text-foreground/90 leading-relaxed">
            {client.notes}
          </p>
        </div>
      </div>

      {/* Recent Activity Timeline */}
      <div className="flex flex-col gap-3 p-4 bg-white border border-border rounded-lg shadow-card w-full">
        <div className="flex items-center justify-between border-b border-border/40 pb-2">
          <h3 className="font-montserrat font-bold text-[15px] text-foreground">Recent Activity</h3>
          <button
            type="button"
            className="font-montserrat text-[12px] text-purple font-semibold flex items-center gap-1 hover:underline cursor-pointer"
          >
            View all activity <ExternalLink className="size-3" />
          </button>
        </div>

        <div className="flex flex-col gap-4 pt-1">
          <div className="flex items-start gap-3">
            <div className="size-8 rounded-full bg-info/10 text-info flex items-center justify-center shrink-0">
              <CheckCircle2 className="size-4" />
            </div>
            <div className="flex flex-col">
              <p className="font-montserrat text-[12px] text-foreground">
                <span className="font-bold">Barry</span> confirmed TJ-1048 and sent final itinerary to Hope
              </p>
              <span className="font-montserrat text-[10px] text-muted-foreground">Aug 9 · 15:42</span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="size-8 rounded-full bg-purple/10 text-purple flex items-center justify-center shrink-0">
              <Plane className="size-4" />
            </div>
            <div className="flex flex-col">
              <p className="font-montserrat text-[12px] text-foreground">
                <span className="font-bold">ExecuJet</span> operator confirmation received for TJ-1048
              </p>
              <span className="font-montserrat text-[10px] text-muted-foreground">Aug 9 · 14:20</span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="size-8 rounded-full bg-success/10 text-success flex items-center justify-center shrink-0">
              <DollarSign className="size-4" />
            </div>
            <div className="flex flex-col">
              <p className="font-montserrat text-[12px] text-foreground">
                <span className="font-bold">Ari</span> payment received — $42,500 cleared for TJ-1048
              </p>
              <span className="font-montserrat text-[10px] text-muted-foreground">Aug 8 · 17:35</span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="size-8 rounded-full bg-warning/10 text-warning flex items-center justify-center shrink-0">
              <FileText className="size-4" />
            </div>
            <div className="flex flex-col">
              <p className="font-montserrat text-[12px] text-foreground">
                <span className="font-bold">Barry</span> sent round trip quote Q-2026-042 ($79,500)
              </p>
              <span className="font-montserrat text-[10px] text-muted-foreground">Aug 8 · 11:00</span>
            </div>
          </div>
        </div>
      </div>

      {/* Follow-up Banner Card */}
      <div className="p-4 bg-warning/5 border border-warning/30 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-full bg-warning/15 text-warning flex items-center justify-center shrink-0">
            <AlertTriangle className="size-4.5" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-montserrat font-bold text-[13px] text-foreground">
                Follow-up: Aug 12, 2026
              </span>
              <Badge tone="info" size="sm" className="font-bold text-[10px]">
                Upcoming
              </Badge>
            </div>
            <p className="font-montserrat text-[11px] text-muted-foreground">
              Check availability for Miami → New York round trip in September
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-3 text-[12px] gap-1.5 font-medium flex-1 sm:flex-none"
            onClick={onScheduleFollowUp}
          >
            <Calendar className="size-3.5" />
            Schedule Follow-up
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-3 text-[12px] gap-1.5 font-medium flex-1 sm:flex-none"
            onClick={() => alert("Marked follow-up as complete!")}
          >
            <Check className="size-3.5" />
            Mark Complete
          </Button>
        </div>
      </div>
    </div>
  );
}
