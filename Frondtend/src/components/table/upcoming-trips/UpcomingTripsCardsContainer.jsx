import TripCard from "./TripCard";

export default function UpcomingTripsCardsContainer({ trips }) {
  return (
    <div className="flex flex-col gap-3 p-4 w-full">
      {trips?.map((trip) => (
        <TripCard key={trip?.trip} trip={trip} />
      ))}
    </div>
  );
}
