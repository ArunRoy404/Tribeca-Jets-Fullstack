"use client";

import DetailCard from "@/components/common/DetailCard";
import ClientFollowUpBanner from "@/components/clients/ClientFollowUpBanner";

/**
 * Client Activity Log Tab
 *
 * TODO [API Integration - Activity / Audit Module]:
 * When the Activity / Audit Log API module is connected to Clients:
 * 1. Fetch activities for this client:
 *    GET /api/clients/{clientId}/activity?page={page}&limit={limit}
 * 2. Expected Activity record schema:
 *    - id: string | number
 *    - user: string (author name, e.g. "Barry", "Ari", or system)
 *    - action: string (action description)
 *    - time: string (formatted timestamp string)
 *    - icon: ReactNode (optional category icon)
 *    - color: string (optional category icon badge tone)
 * 3. In the absence of activity records, render an honest empty state per project agreement.
 */
export default function ClientActivityTab({ activities = [], onScheduleFollowUp }) {
  const hasActivities = Array.isArray(activities) && activities.length > 0;

  return (
    <DetailCard className="gap-6 p-4 sm:p-6">
      {hasActivities ? (
        <div className="flex flex-col gap-4 relative pl-2 w-full">
          {activities.map((item, idx) => (
            <div key={item.id || idx} className="flex items-start gap-3.5 relative">
              {idx < activities.length - 1 && (
                <div className="absolute left-[15px] top-8 w-0.5 h-full bg-border/60 -z-0" />
              )}
              <div
                className={`size-8 rounded-full flex items-center justify-center shrink-0 z-10 ${item.color || "bg-secondary text-foreground"}`}
              >
                {item.icon}
              </div>
              <div className="flex flex-col min-w-0 pt-0.5">
                <p className="font-montserrat text-[12px] sm:text-[13px] text-foreground leading-snug">
                  <span className="font-bold">{item.user}</span> {item.action}
                </p>
                <span className="font-montserrat text-[11px] text-muted-foreground mt-0.5">
                  {item.time}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-12 flex flex-col items-center justify-center text-center gap-2">
          <p className="font-montserrat font-semibold text-[15px] text-foreground">
            No activity on record
          </p>
          <p className="font-montserrat text-[12px] text-muted-foreground max-w-sm">
            No historical activities or interactions have been recorded for this client yet.
          </p>
        </div>
      )}

      {/* Follow-up Banner inside the same container */}
      <ClientFollowUpBanner onScheduleFollowUp={onScheduleFollowUp} />
    </DetailCard>
  );
}
