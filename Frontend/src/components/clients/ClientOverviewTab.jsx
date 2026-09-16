"use client";

import { AlertTriangle, Plane, Calendar, Check, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUpdateClient } from "@/hooks/clients";

const WINDOW_TONE = {
  OVERDUE: "destructive",
  TODAY: "warning",
  UPCOMING: "info",
};

function Card({ label, children }) {
  return (
    <div className="p-4 bg-white border border-border rounded-lg shadow-card flex flex-col gap-2">
      <span className="font-montserrat text-[11px] text-muted-foreground uppercase font-medium">
        {label}
      </span>
      {children}
    </div>
  );
}

function None() {
  return <span className="font-montserrat text-[12px] text-muted-foreground">None on file</span>;
}

/**
 * Only what the record actually holds.
 *
 * This tab previously showed a "Recent Trip" (Miami → Los Angeles, #TJ-1048),
 * a follow-up dated Aug 12 2026 and four activity events naming brokers,
 * operators and payment amounts — all hardcoded, all identical on every
 * client's page. The trips, quotes, payments and activity modules do not exist
 * yet, so those sections say so.
 */
export default function ClientOverviewTab({ client, onScheduleFollowUp }) {
  const { mutate: updateClient, isPending } = useUpdateClient();
  if (!client) return null;

  const routes = client.preferences?.preferredRoutes ?? [];
  const aircraft = client.preferences?.preferredAircraft ?? [];

  const clearFollowUp = () =>
    updateClient({ id: client.id, nextFollowUpAt: null, followUpNote: null });

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
        <Card label="Preferred Routes">
          <div className="font-montserrat font-bold text-[13px] text-foreground">
            {routes.length ? routes.join(", ") : <None />}
          </div>
        </Card>

        <Card label="Preferred Aircraft">
          <div className="flex flex-col gap-1 text-[12px] font-montserrat">
            {aircraft.length ? (
              aircraft.map((ac) => (
                <div key={ac} className="flex items-center gap-1.5 text-muted-foreground">
                  <Plane className="size-3.5 text-purple shrink-0" />
                  <span className="font-medium text-foreground">{ac}</span>
                </div>
              ))
            ) : (
              <None />
            )}
          </div>
        </Card>
      </div>

      {client.notes ? (
        <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg flex items-start gap-3 w-full">
          <AlertTriangle className="size-5 text-warning shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1">
            <h4 className="font-montserrat font-bold text-[13px] text-foreground">Important Notes</h4>
            <p className="font-montserrat text-[12px] text-foreground/90 leading-relaxed">
              {client.notes}
            </p>
          </div>
        </div>
      ) : null}

      {/* Awaiting the activity timeline module. The backend records AuditLog
          rows already, but nothing exposes them per record yet. */}
      <div className="flex flex-col items-center justify-center p-10 text-center bg-white rounded-lg border border-border w-full">
        <History className="size-8 text-muted-foreground/50 mb-2" />
        <p className="font-montserrat font-bold text-[14px] text-foreground">No Activity Yet</p>
        <p className="font-montserrat text-[12px] text-muted-foreground mt-1">
          Quotes, trips and payments for this client will appear here.
        </p>
      </div>

      <div className="p-4 bg-warning/5 border border-warning/30 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-full bg-warning/15 text-warning flex items-center justify-center shrink-0">
            <AlertTriangle className="size-4.5" />
          </div>
          <div className="flex flex-col">
            {client.nextFollowUpAt ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="font-montserrat font-bold text-[13px] text-foreground">
                    Follow-up: {client.nextFollowUpLabel}
                  </span>
                  <Badge
                    tone={WINDOW_TONE[client.followUpWindow] ?? "info"}
                    size="sm"
                    className="font-bold text-[10px]"
                  >
                    {client.followUpWindowLabel}
                  </Badge>
                </div>
                {client.followUpNote ? (
                  <p className="font-montserrat text-[11px] text-muted-foreground">
                    {client.followUpNote}
                  </p>
                ) : null}
              </>
            ) : (
              <span className="font-montserrat font-bold text-[13px] text-foreground">
                No follow-up scheduled
              </span>
            )}
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
          {/* Clearing the date is what "done" means — there is nowhere to
              record a completed follow-up until the tasks module exists. */}
          {client.nextFollowUpAt ? (
            <Button
              variant="outline"
              size="sm"
              disabled={isPending}
              className="h-9 px-3 text-[12px] gap-1.5 font-medium flex-1 sm:flex-none"
              onClick={clearFollowUp}
            >
              <Check className="size-3.5" />
              Mark Complete
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
