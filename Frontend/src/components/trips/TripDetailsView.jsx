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

      <CommonCard className="m-4 md:m-6">
        <TripSummaryBar trip={trip} />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start p-4 sm:p-6">
          <div className="flex flex-col gap-6 min-w-0">
            <TripActionBar trip={trip} />
            <TripFlightRouteCard trip={trip} />
            <TripFlightInfoCard trip={trip} />
            <TripClientCard trip={trip} />
            <TripOperatorCard trip={trip} />
            <TripFinancialCard trip={trip} />
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
            <TripPassengersCard trip={trip} />
            <TripDocumentsCard trip={trip} />
            <TripNotesCard trip={trip} />
          </div>
        </div>
      </CommonCard>
    </div>
  );
}
