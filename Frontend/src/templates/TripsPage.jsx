import SimpleStatsRow from "@/components/common/SimpleStatsRow";
import TripsContainer from "@/components/table/trips/TripsContainer";
import { tripsStats } from "@/dummyData/trips";

export default function TripsPage() {
  return (
    <div className="flex flex-col gap-6 px-4 sm:px-6 py-6 pb-8">
      <SimpleStatsRow stats={tripsStats} />
      <TripsContainer />
    </div>
  );
}
