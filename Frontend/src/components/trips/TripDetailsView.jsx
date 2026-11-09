"use client";

import DetailHeader from "@/components/common/DetailHeader";
import CommonCard from "@/components/common/CommonCard";
import NotesTimeline from "@/components/notes/NotesTimeline";
import DetailCard from "@/components/trips/DetailCard";
import TripHeaderTitle from "@/components/trips/header/TripHeaderTitle";
import TripHeaderActions from "@/components/trips/header/TripHeaderActions";
import TripSummaryBar from "@/components/trips/header/TripSummaryBar";
import TripFlightRouteCard from "@/components/trips/tripRoute/TripFlightRouteCard";
import TripFlightInfoCard from "@/components/trips/flightInfo/TripFlightInfoCard";
import TripClientCard from "@/components/trips/client/TripClientCard";
import TripOperatorCard from "@/components/trips/operator/TripOperatorCard";
import TripFinancialCard from "@/components/trips/financial/TripFinancialCard";
import TripProgressCard from "@/components/trips/progress/TripProgressCard";
import TripActionBar from "@/components/trips/actions/TripActionBar";
import TripConfirmationCard from "@/components/trips/confirmation/TripConfirmationCard";
import TripContractCard from "@/components/trips/contract/TripContractCard";
import TripDocumentsCard from "@/components/trips/documents/TripDocumentsCard";
import TripNotesCard from "@/components/trips/notes/TripNotesCard";
import TripPassengersCard from "@/components/trips/passengers/TripPassengersCard";

export default function TripDetailsView({ trip }) {
  const breadcrumbs = [
    { label: "Operations" },
    { label: "All Operations", href: "/dashboard/trips" },
    { label: trip?.reference },
  ];

  return (
    <div className="flex flex-col w-full bg-page-bg min-h-screen">
      <DetailHeader
        breadcrumbs={breadcrumbs}
        titleContent={<TripHeaderTitle trip={trip} />}
        actions={<TripHeaderActions trip={trip} />}
      />

      {trip?.approvalStatus === "PENDING" && (
        <div className="mx-4 md:mx-6 mt-4 flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-md text-amber-500 text-sm">
          <span className="text-xl">⚠️</span>
          <div>
            <p className="font-semibold text-white">Trip Pending Administrator Approval</p>
            <p className="text-xs text-amber-300/80">
              This trip was submitted by a broker and requires administrator approval before it can proceed to Confirmed status.
            </p>
          </div>
        </div>
      )}

      {trip?.approvalStatus === "REJECTED" && (
        <div className="mx-4 md:mx-6 mt-4 flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/30 rounded-md text-destructive text-sm">
          <span className="text-xl">❌</span>
          <div>
            <p className="font-semibold text-white">Trip Approval Declined</p>
            <p className="text-xs text-destructive-foreground/90">
              Reason: {trip.rejectionReason || "No specific reason provided."}
            </p>
          </div>
        </div>
      )}

      <CommonCard className="m-4 md:m-6">
        <TripSummaryBar trip={trip} />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start p-4 sm:p-6">
          <div className="flex flex-col gap-6 min-w-0">
            <div id="trip-action-bar">
              <TripActionBar trip={trip} />
            </div>
            <TripFlightRouteCard trip={trip} />
            <div id="flight-info-card">
              <TripFlightInfoCard trip={trip} />
            </div>
            <div id="client-card">
              <TripClientCard trip={trip} />
            </div>
            <div id="operator-card">
              <TripOperatorCard trip={trip} />
            </div>
            <div id="financial-card">
              <TripFinancialCard trip={trip} />
            </div>
            <TripProgressCard trip={trip} />
            {/* Client adjustment #5's trip timeline: notes people write,
                merged with every recorded change — bookings, status moves,
                edits. The same component the client page uses. */}
            <DetailCard title="Activity Timeline">
              <NotesTimeline subjectType="TRIP" subjectId={trip?.id} />
            </DetailCard>
          </div>

          <div className="flex flex-col gap-6 min-w-0">
            <TripConfirmationCard trip={trip} />
            <TripContractCard trip={trip} />
            <div id="passengers-card">
              <TripPassengersCard trip={trip} />
            </div>
            <TripDocumentsCard trip={trip} />
            <TripNotesCard trip={trip} />
          </div>
        </div>
      </CommonCard>
    </div>
  );
}
