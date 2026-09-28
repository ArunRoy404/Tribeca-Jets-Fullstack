import DetailCard from "@/components/trips/DetailCard";
import { formatDate } from "@/lib/archive";

/**
 * The manifest. Whoever may read the trip may read it — passport numbers
 * included, because the desk needs them for the operator — and nobody else
 * ever receives it: the API returns passengers only with the trip itself.
 */
export default function TripPassengersCard({ trip }) {
  const passengers = trip?.passengers ?? [];

  return (
    <DetailCard title={`Passengers${passengers.length ? ` · ${passengers.length}` : ""}`}>
      {passengers.length === 0 ? (
        <p className="font-montserrat text-[12px] text-muted-foreground">No named passengers yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {passengers.map((p) => (
            <div key={p.id} className="flex flex-col gap-0.5">
              <p className="font-montserrat font-semibold text-[13px] text-foreground">{p.fullName}</p>
              <p className="font-montserrat text-[11px] text-muted-foreground">
                {p.dateOfBirth ? `Born ${formatDate(p.dateOfBirth)}` : "Date of birth not on file"}
                {" · "}
                {p.passportNumber ? `Passport ${p.passportNumber}` : "No passport on file"}
              </p>
            </div>
          ))}
        </div>
      )}
    </DetailCard>
  );
}
