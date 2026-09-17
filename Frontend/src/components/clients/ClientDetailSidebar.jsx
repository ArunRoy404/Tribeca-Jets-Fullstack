"use client";

import { Plane, Edit } from "lucide-react";
import DetailField from "@/components/common/DetailField";
import DetailCard from "@/components/common/DetailCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function ClientDetailSidebar({ client, onEditNotes }) {
  if (!client) return null;

  const email = client.email || "—";
  const phone = client.phone || "—";
  const company = client.company || "—";
  const type = client.type || "—";
  const leadSource = client.leadSource || "—";
  const broker = client.broker || "Unassigned";
  const added = client.addedLabel || "—";

  const homeAirport = client.homeAirport && client.homeAirport !== "—" ? client.homeAirport : null;
  const preferredAirports = client.preferences?.preferredAirports ?? [];
  const preferredRoutes = client.preferences?.preferredRoutes ?? [];
  const preferredAircraft = client.preferences?.preferredAircraft ?? [];

  const notes = client.notes || "No internal notes on file.";

  return (
    <div className="flex flex-col gap-5 w-full lg:w-80 shrink-0">
      {/* Contact Card */}
      <DetailCard title="Contact">
        <div className="flex flex-col gap-3">
          <DetailField label="Email" value={email} valueClassName="font-semibold text-purple truncate" />
          <DetailField label="Phone" value={phone} valueClassName="font-semibold" />
          <DetailField label="Company" value={company} valueClassName="font-semibold" />
          <DetailField label="Client Type" value={type} valueClassName="font-semibold" />
          <DetailField label="Lead Source" value={leadSource} valueClassName="font-semibold" />
          <DetailField label="Broker" value={broker} valueClassName="font-semibold" />
          <DetailField label="Added" value={added} valueClassName="font-semibold text-muted-foreground" />
        </div>
      </DetailCard>

      {/* Travel Preferences Card */}
      <DetailCard title="Travel Preferences">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <span className="font-montserrat text-[11px] text-muted-foreground uppercase font-medium">Home Airport</span>
            {homeAirport ? (
              <Badge tone="secondary" className="w-fit font-bold text-[11px] px-2.5 py-0.5">
                {homeAirport}
              </Badge>
            ) : (
              <span className="font-montserrat text-[12px] text-muted-foreground">—</span>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <span className="font-montserrat text-[11px] text-muted-foreground uppercase font-medium">Preferred Airports</span>
            {preferredAirports.length > 0 ? (
              <div className="flex items-center gap-1.5 flex-wrap">
                {preferredAirports.map((ap) => (
                  <Badge key={ap} tone="secondary" className="font-bold text-[11px] px-2.5 py-0.5">
                    {ap}
                  </Badge>
                ))}
              </div>
            ) : (
              <span className="font-montserrat text-[12px] text-muted-foreground">—</span>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <span className="font-montserrat text-[11px] text-muted-foreground uppercase font-medium">Preferred Routes</span>
            <div className="font-montserrat font-bold text-[12px] text-foreground">
              {preferredRoutes.length > 0 ? preferredRoutes.join(", ") : "—"}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="font-montserrat text-[11px] text-muted-foreground uppercase font-medium">Preferred Aircraft</span>
            {preferredAircraft.length > 0 ? (
              <div className="flex flex-col gap-1 text-[12px] font-montserrat">
                {preferredAircraft.map((ac) => (
                  <div key={ac} className="flex items-center gap-1.5 text-muted-foreground">
                    <Plane className="size-3.5 text-purple shrink-0" />
                    <span className="font-medium text-foreground">{ac}</span>
                  </div>
                ))}
              </div>
            ) : (
              <span className="font-montserrat text-[12px] text-muted-foreground">—</span>
            )}
          </div>
        </div>
      </DetailCard>

      {/* Internal Notes Card */}
      <DetailCard
        title="Internal Notes"
        action={
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-[11px] gap-1 font-medium cursor-pointer"
            onClick={onEditNotes}
          >
            <Edit className="size-3" />
            Edit Notes
          </Button>
        }
      >
        <p className="font-montserrat text-[12px] text-muted-foreground leading-relaxed">
          {notes}
        </p>
      </DetailCard>
    </div>
  );
}
