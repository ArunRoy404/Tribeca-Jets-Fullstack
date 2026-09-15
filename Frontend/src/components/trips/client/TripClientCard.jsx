import Link from "next/link";
import { ExternalLink, Mail, Phone } from "lucide-react";
import DetailCard from "@/components/trips/DetailCard";

export default function TripClientCard({ trip }) {
  return (
    <DetailCard
      title="Client"
      action={
        <Link href="/dashboard/clients" className="flex items-center gap-1 font-montserrat font-semibold text-[12px] text-purple">
          View Client
          <ExternalLink className="size-3" />
        </Link>
      }
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center rounded-full bg-secondary size-9 shrink-0 font-montserrat font-bold text-[14px] text-foreground">
          {trip?.client?.charAt?.(0)}
        </div>
        <div className="flex flex-col gap-1">
          <p className="font-montserrat font-bold text-[14px] text-foreground">{trip?.client}</p>
          <div className="flex items-center gap-1 font-montserrat text-[12px] text-muted-foreground">
            <Mail className="size-3" />
            {trip?.client?.toLowerCase?.()?.replace?.(" ", ".")}@example.com
          </div>
          <div className="flex items-center gap-1 font-montserrat text-[12px] text-muted-foreground">
            <Phone className="size-3" />
            +1 (212) 555-0100
          </div>
        </div>
      </div>
    </DetailCard>
  );
}
