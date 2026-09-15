import DateFilterRow from "@/components/dashboard/stats/DateFilterRow";
import StatsGrid from "@/components/dashboard/stats/StatsGrid";
import TodaysPriorities from "@/components/dashboard/todays-priorities/TodaysPriorities";
import EmptyLegsSection from "@/components/dashboard/empty-legs/EmptyLegsSection";
import RecentActivityFeed from "@/components/dashboard/recent-activity/RecentActivityFeed";
import FollowUpsSection from "@/components/dashboard/follow-ups/FollowUpsSection";
import UpcomingTripsContainer from "@/components/table/upcoming-trips/UpcomingTripsContainer";
import FinancialAttention from "@/components/dashboard/financial-attention/FinancialAttention";
import AskAnythingPopover from "@/components/dashboard/assistant/AskAnythingPopover";

export default function OverviewPage() {
  return (
    <>
      <div className="flex flex-col gap-6 py-6">
        <DateFilterRow active="This Week" />
        <StatsGrid />
      </div>

      <div className="flex flex-col gap-6 px-4 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <TodaysPriorities />
          <EmptyLegsSection revealDelay={0.1} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <RecentActivityFeed />
          <FollowUpsSection revealDelay={0.1} />
        </div>
        <UpcomingTripsContainer />
        <FinancialAttention />
      </div>

      <AskAnythingPopover />
    </>
  );
}
