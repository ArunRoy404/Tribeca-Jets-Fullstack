import { Check } from "lucide-react";
import DetailCard from "@/components/trips/DetailCard";
import { cn } from "@/lib/utils";

/**
 * The checklist, each item a fact the trip actually records. Each tick is a
 * real event, never derived from the trip's status — a status implies
 * nothing about whether the document went out or the bill was settled.
 */
export default function TripConfirmationCard({ trip }) {
  const committed = ["BOOKED", "CONFIRMED", "IN_FLIGHT", "COMPLETED"].includes(trip?.rawStatus);
  const named = (trip?.passengers?.length ?? 0) > 0;
  const items = [
    { label: "Client committed", done: committed },
    { label: "Aircraft assigned", done: trip?.aircraft && trip.aircraft !== "—" },
    { label: "Operator confirmed", done: Boolean(trip?.operatorConfirmed) },
    { label: "Passengers named", done: named },
    { label: "Price set", done: trip?.financial?.total && trip.financial.total !== "—" },
    { label: "Itinerary sent", done: Boolean(trip?.itinerary?.sentAt) },
    { label: "Payment received", done: trip?.clientBilling?.rawState === "PAID" },
  ];

  return (
    <DetailCard title="Confirmation">
      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-2">
            <p className="font-montserrat text-[13px] text-foreground">{item.label}</p>
            <div className={cn("flex items-center justify-center rounded-full size-4 shrink-0", item.done ? "bg-success text-white" : "bg-secondary text-muted-foreground")}>
              <Check className="size-2.5" />
            </div>
          </div>
        ))}
      </div>
    </DetailCard>
  );
}
