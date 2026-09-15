"use client";

import DetailHeader from "@/components/common/DetailHeader";
import CommonCard from "@/components/common/CommonCard";
import TripHeaderTitle from "@/components/trips/header/TripHeaderTitle";
import TripHeaderActions from "@/components/trips/header/TripHeaderActions";
import TripSummaryBar from "@/components/trips/header/TripSummaryBar";
import TripFlightRouteCard from "@/components/trips/tripRoute/TripFlightRouteCard";
import TripFlightInfoCard from "@/components/trips/flightInfo/TripFlightInfoCard";
import TripClientCard from "@/components/trips/client/TripClientCard";
import TripOperatorCard from "@/components/trips/operator/TripOperatorCard";
import TripFinancialCard from "@/components/trips/financial/TripFinancialCard";
import TripProgressCard from "@/components/trips/progress/TripProgressCard";
import TripActivityCard from "@/components/trips/activity/TripActivityCard";
import TripActionBar from "@/components/trips/actions/TripActionBar";
import TripConfirmationCard from "@/components/trips/confirmation/TripConfirmationCard";
import TripDocumentsCard from "@/components/trips/documents/TripDocumentsCard";
import TripNotesCard from "@/components/trips/notes/TripNotesCard";

export default function TripDetailsView({ trip }) {
  const breadcrumbs = [
    { label: "Operations" },
    { label: "All Operations", href: "/dashboard/trips" },
    { label: trip?.id },
  ];

  return (
    <div className="flex flex-col w-full bg-page-bg min-h-screen">
      {/* Top Header connected with navbar */}
      <DetailHeader
        breadcrumbs={breadcrumbs}
        titleContent={<TripHeaderTitle trip={trip} />}
        actions={<TripHeaderActions />}
      />

      {/* Main Details Wrapper using CommonCard */}
      <CommonCard className="m-4 md:m-6">
        {/* Single Row Summary Bar */}
        <TripSummaryBar trip={trip} />

        {/* 2-Column Section Layout inside CommonCard */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start p-4 sm:p-6">
          {/* Left Main Column */}
          <div className="flex flex-col gap-6 min-w-0">
            <TripFlightRouteCard trip={trip} />
            <TripFlightInfoCard trip={trip} />
            <TripClientCard trip={trip} />
            <TripOperatorCard trip={trip} />
            <TripFinancialCard trip={trip} />
            <TripProgressCard trip={trip} />
            <TripActivityCard trip={trip} />
            <TripActionBar trip={trip} />
          </div>

          {/* Right Sidebar Column */}
          <div className="flex flex-col gap-6 min-w-0">
            <TripConfirmationCard trip={trip} />
            <TripDocumentsCard trip={trip} />
            <TripNotesCard trip={trip} />
          </div>
        </div>
      </CommonCard>
    </div>
  );
}
