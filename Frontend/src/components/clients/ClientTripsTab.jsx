"use client";

import DetailCard from "@/components/common/DetailCard";
import ClientFollowUpBanner from "@/components/clients/ClientFollowUpBanner";
import RelatedTripsList from "@/components/trips/RelatedTripsList";

/**
 * The client's trips — live since Trips (#11) shipped, read from
 * `GET /trips?clientId=` within the caller's scope.
 */
export default function ClientTripsTab({ client, onScheduleFollowUp, onMarkComplete, isCompleting }) {
  return (
    <DetailCard className="gap-6 p-4 sm:p-6">
      <RelatedTripsList filter={{ clientId: client?.id }} emptyText="No active or historical trips recorded for this client yet." />

      <ClientFollowUpBanner
        client={client}
        onScheduleFollowUp={onScheduleFollowUp}
        onMarkComplete={onMarkComplete}
        isCompleting={isCompleting}
      />
    </DetailCard>
  );
}
