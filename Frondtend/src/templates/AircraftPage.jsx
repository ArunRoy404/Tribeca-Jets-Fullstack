import SimpleStatsRow from "@/components/common/SimpleStatsRow";
import AircraftContainer from "@/components/table/aircraft/AircraftContainer";
import { aircraftStats } from "@/dummyData/aircraft";

export default function AircraftPage() {
  return (
    <div className="flex flex-col gap-6 px-4 sm:px-6 py-6 pb-8">
      <SimpleStatsRow stats={aircraftStats} />
      <AircraftContainer />
    </div>
  );
}
