import SimpleStatsRow from "@/components/common/SimpleStatsRow";
import AirportsContainer from "@/components/table/airports/AirportsContainer";
import { airportStats } from "@/dummyData/airports";

export default function AirportsPage() {
  return (
    <div className="flex flex-col gap-6 px-4 sm:px-6 py-6 pb-8">
      <SimpleStatsRow stats={airportStats} />
      <AirportsContainer />
    </div>
  );
}
