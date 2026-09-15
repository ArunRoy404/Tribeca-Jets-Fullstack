import { TRIP_PROGRESS_STEPS } from "@/dummyData/tripDetails";
import DetailCard from "@/components/trips/DetailCard";
import ProgressStepper from "@/components/trips/progress/ProgressStepper";

export default function TripProgressCard({ trip }) {
  return (
    <DetailCard
      title="Request-to-Completion Progress"
      action={
        <span className="font-montserrat font-semibold text-[12px] text-warning">
          Current: {TRIP_PROGRESS_STEPS?.[trip?.currentStepIndex]}
        </span>
      }
    >
      <ProgressStepper steps={TRIP_PROGRESS_STEPS} currentIndex={trip?.currentStepIndex} />
    </DetailCard>
  );
}
