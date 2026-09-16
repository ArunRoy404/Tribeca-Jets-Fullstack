import AircraftStats from "@/components/aircraft/AircraftStats";
import AircraftContainer from "@/components/table/aircraft/AircraftContainer";

export default function AircraftPage() {
  return (
    <div className="flex flex-col gap-6 px-4 sm:px-6 py-6 pb-8">
      <AircraftStats />
      <AircraftContainer />
    </div>
  );
}
