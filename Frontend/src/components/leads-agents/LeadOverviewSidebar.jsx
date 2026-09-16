"use client";

import LeadContactCard from "./LeadContactCard";
import LeadTripInterestCard from "./LeadTripInterestCard";
import LeadActivityTimelineCard from "./LeadActivityTimelineCard";

export default function LeadOverviewSidebar({ lead, request }) {
  return (
    <div className="flex flex-col gap-4 p-4 sm:p-5 bg-white border border-border rounded-lg shadow-card w-full">
      <h3 className="font-montserrat font-bold text-[14px] text-foreground">
        Overview
      </h3>
      <LeadContactCard lead={lead} />
      <LeadTripInterestCard lead={lead} request={request} />
      <LeadActivityTimelineCard />
    </div>
  );
}
