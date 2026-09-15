import ItinerariesStats from "@/components/itineraries/ItinerariesStats";
import ItinerariesContainer from "@/components/table/itineraries/ItinerariesContainer";

export default function ItinerariesPage() {
  return (
    <div className="flex flex-col gap-6 px-4 sm:px-6 py-6 pb-8">
      <ItinerariesStats />
      <ItinerariesContainer />
    </div>
  );
}
