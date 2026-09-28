import DetailCard from "@/components/trips/DetailCard";
import ProgressStepper from "@/components/trips/progress/ProgressStepper";
import { TRIP_PROGRESS, formatTripStatus } from "@/lib/trip";

/**
 * Where the trip is on its lifecycle — the real statuses, not the fourteen
 * steps the dummy board derived from a status string. A cancelled trip says
 * so rather than showing a half-filled bar.
 */
export default function TripProgressCard({ trip }) {
  const cancelled = trip?.rawStatus === "CANCELLED";
  const index = Math.max(0, TRIP_PROGRESS.indexOf(trip?.rawStatus));
  const done = trip?.rawStatus === "COMPLETED";

  return (
    <DetailCard
      title="Booking Progress"
      action={
        <span className={`font-montserrat font-semibold text-[12px] ${cancelled ? "text-destructive" : "text-warning"}`}>
          {cancelled ? "Cancelled" : `Current: ${formatTripStatus(trip?.rawStatus)}`}
        </span>
      }
    >
      {cancelled ? (
        <p className="font-montserrat text-[13px] text-muted-foreground">This trip was cancelled. Reopen it as a draft to take it forward again.</p>
      ) : (
        <ProgressStepper steps={TRIP_PROGRESS.map(formatTripStatus)} currentIndex={done ? TRIP_PROGRESS.length : index} />
      )}
    </DetailCard>
  );
}
