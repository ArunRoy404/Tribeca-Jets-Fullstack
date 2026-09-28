"use client";

import { useRouter } from "next/navigation";
import TripCard from "./TripCard";

export default function UpcomingTripsCardsContainer({ trips }) {
  const router = useRouter();
  return (
    <div className="flex flex-col gap-3 p-4 w-full">
      {trips?.map((trip) => (
        <TripCard
          key={trip?.id ?? trip?.trip}
          trip={trip}
          onClick={trip?.id ? () => router.push(`/dashboard/trips/${trip.id}`) : undefined}
        />
      ))}
    </div>
  );
}
