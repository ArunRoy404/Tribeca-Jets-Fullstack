"use client";

import Link from "next/link";
import { Plane } from "lucide-react";
import SectionCard from "@/components/common/SectionCard";
import DetailField from "@/components/common/DetailField";
import StatusBadge from "@/components/common/StatusBadge";

/**
 * The lead's enquiries — real trip request records, not a fabricated activity
 * feed.
 *
 * The previous version rendered a hardcoded timeline ("Welcome email sent…",
 * "Proposal generated for TEB → MIA Heavy Jet") that was identical for every
 * lead. A real activity timeline needs the Communications module, which does
 * not exist; what does exist is what the client actually asked for.
 */
export default function LeadOverviewCards({ lead, requests = [] }) {
  if (!lead) return null;

  return (
    <div className="flex flex-col gap-6 w-full">
      <SectionCard title="LEAD DETAILS">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          <DetailField label="Company" value={lead.company} />
          <DetailField label="Email" value={lead.email} />
          <DetailField label="Phone" value={lead.phone} />
          <DetailField label="Source" value={lead.source || "—"} />
          <DetailField label="Stage" value={lead.stage || "—"} />
          <DetailField label="Priority" value={lead.priority || "—"} />
        </div>
      </SectionCard>

      <SectionCard title={`ENQUIRIES (${requests.length})`}>
        {requests.length === 0 ? (
          <p className="font-montserrat text-[13px] text-muted-foreground">
            Nothing requested yet. Add a trip request when they tell you where
            they want to go.
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-secondary w-full">
            {requests.map((request) => (
              <div key={request.id} className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-2 font-montserrat font-bold text-[13px] text-foreground">
                    <Plane className="size-3.5 text-purple shrink-0" />
                    {request.reference} · {request.route}
                  </span>
                  <StatusBadge status={request.status} bordered />
                </div>
                <div className="flex items-center gap-4 flex-wrap font-montserrat text-[12px] text-muted-foreground">
                  <span>
                    {request.departureDate}
                    {request.isRoundTrip ? ` → ${request.returnDate}` : " · one way"}
                  </span>
                  <span>{request.passengers} pax</span>
                  <span className="font-semibold text-foreground">
                    {request.estimatedValue}
                  </span>
                </div>
                {request.summary ? (
                  <p className="font-montserrat text-[12px] text-foreground">
                    {request.summary}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="ACTIVITY">
        {/* Honest, rather than the invented three-event feed this replaced. */}
        <p className="font-montserrat text-[13px] text-muted-foreground">
          A full contact timeline arrives with the Communications module. Until
          then, the audit log records every change made to this record.
        </p>
      </SectionCard>
    </div>
  );
}
