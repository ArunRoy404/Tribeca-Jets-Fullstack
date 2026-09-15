import DetailCard from "@/components/trips/DetailCard";

export default function TripNotesCard({ trip }) {
  return (
    <DetailCard title="Notes">
      <div className="flex flex-col gap-3">
        <div>
          <p className="font-montserrat font-semibold text-[12px] text-foreground">Internal Notes</p>
          <p className="font-montserrat text-[12px] text-muted-foreground">{trip?.notes?.internal}</p>
        </div>
        <div>
          <p className="font-montserrat font-semibold text-[12px] text-foreground">Client Notes</p>
          <p className="font-montserrat text-[12px] text-muted-foreground">{trip?.notes?.client}</p>
        </div>
      </div>
    </DetailCard>
  );
}
