import Link from "next/link";
import { ExternalLink, Mail, Phone } from "lucide-react";
import DetailCard from "@/components/trips/DetailCard";

/** The client, read from the record — the card used to invent an email and a phone number. */
export default function TripClientCard({ trip }) {
  return (
    <DetailCard
      title="Client"
      action={
        trip?.clientId ? (
          <Link href={`/dashboard/clients/${trip.clientId}`} className="flex items-center gap-1 font-montserrat font-semibold text-[12px] text-purple">
            View Client
            <ExternalLink className="size-3" />
          </Link>
        ) : null
      }
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center rounded-full bg-secondary size-9 shrink-0 font-montserrat font-bold text-[14px] text-foreground">
          {trip?.client?.charAt?.(0)}
        </div>
        <div className="flex flex-col gap-1 min-w-0">
          <p className="font-montserrat font-bold text-[14px] text-foreground truncate">{trip?.client}</p>
          <div className="flex items-center gap-1 font-montserrat text-[12px] text-muted-foreground min-w-0">
            <Mail className="size-3 shrink-0" />
            <span className="truncate">{trip?.clientEmail ?? "No email on file"}</span>
          </div>
          <div className="flex items-center gap-1 font-montserrat text-[12px] text-muted-foreground">
            <Phone className="size-3 shrink-0" />
            {trip?.clientPhone ?? "No phone on file"}
          </div>
        </div>
      </div>
    </DetailCard>
  );
}
