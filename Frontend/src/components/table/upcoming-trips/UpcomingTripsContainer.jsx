"use client";

import CommonCard from "@/components/common/CommonCard";
import SectionHeader from "@/components/common/SectionHeader";
import Reveal from "@/components/common/Reveal";
import UpcomingTripsTable from "./UpcomingTripsTable";
import UpcomingTripsCardsContainer from "./UpcomingTripsCardsContainer";
import { useDashboardStore } from "@/store/useDashboardStore";

export default function UpcomingTripsContainer({ revealDelay = 0 }) {
  const trips = useDashboardStore((s) => s.upcomingDashboardTrips);

  return (
    <Reveal delay={revealDelay} className="w-full">
      <CommonCard variant="default" className="p-0 rounded-md overflow-hidden border-border w-full">
        <SectionHeader
          title="Upcoming Trips"
          rightText="View all trips →"
          rightHref="/dashboard/trips"
        />

        <div className="relative w-full lg:hidden">
          <UpcomingTripsCardsContainer trips={trips} />
        </div>

        <UpcomingTripsTable trips={trips} />
      </CommonCard>
    </Reveal>
  );
}
