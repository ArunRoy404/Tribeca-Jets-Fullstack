"use client";

import { Plane, Edit } from "lucide-react";
import DetailField from "@/components/common/DetailField";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function ClientDetailSidebar({ client, onEditNotes }) {
  if (!client) return null;

  return (
    <div className="flex flex-col gap-5 w-full lg:w-80 shrink-0">
      {/* Contact Card */}
      <div className="flex flex-col gap-4 p-5 bg-white border border-border rounded-xl shadow-card w-full">
        <h3 className="font-montserrat font-bold text-[15px] text-foreground border-b border-border/50 pb-2">
          Contact
        </h3>
        <div className="flex flex-col gap-3">
          <DetailField label="Email" value={client.email} valueClassName="font-semibold text-purple truncate" />
          <DetailField label="Phone" value={client.phone} valueClassName="font-semibold" />
          <DetailField label="Company" value={client.company || "N/A"} valueClassName="font-semibold" />
          <DetailField label="Client Type" value={client.type || "Direct"} valueClassName="font-semibold" />
          <DetailField label="Lead Source" value={client.leadSource || "Referral"} valueClassName="font-semibold" />
          <DetailField label="Broker" value={client.broker || "Barry"} valueClassName="font-semibold" />
          <DetailField label="Added" value={client.addedDate || "Jan 2026"} valueClassName="font-semibold text-muted-foreground" />
        </div>
      </div>

      {/* Travel Preferences Card */}
      <div className="flex flex-col gap-4 p-5 bg-white border border-border rounded-xl shadow-card w-full">
        <h3 className="font-montserrat font-bold text-[15px] text-foreground border-b border-border/50 pb-2">
          Travel Preferences
        </h3>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <span className="font-montserrat text-[11px] text-muted-foreground uppercase font-medium">Home Airport</span>
            <Badge tone="secondary" className="w-fit font-bold text-[11px]">
              {client.homeAirport || "KTEB"}
            </Badge>
          </div>

          <div className="flex flex-col gap-1">
            <span className="font-montserrat text-[11px] text-muted-foreground uppercase font-medium">Preferred Airports</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {(client.preferredAirports || ["KTEB", "KMIA"]).map((ap) => (
                <Badge key={ap} tone="secondary" className="font-bold text-[11px]">
                  {ap}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="font-montserrat text-[11px] text-muted-foreground uppercase font-medium">Preferred Routes</span>
            <div className="font-montserrat font-bold text-[12px] text-foreground">
              {client.prefAirports || "KTEB → KMIA"}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="font-montserrat text-[11px] text-muted-foreground uppercase font-medium">Preferred Aircraft</span>
            <div className="flex flex-col gap-1 text-[12px] font-montserrat">
              {(client.preferredAircraft || ["Gulfstream G550", "Global 6000"]).map((ac) => (
                <div key={ac} className="flex items-center gap-1.5 text-muted-foreground">
                  <Plane className="size-3.5 text-purple shrink-0" />
                  <span className="font-medium text-foreground">{ac}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Internal Notes Card */}
      <div className="flex flex-col gap-3 p-5 bg-white border border-border rounded-xl shadow-card w-full">
        <div className="flex items-center justify-between border-b border-border/50 pb-2">
          <h3 className="font-montserrat font-bold text-[15px] text-foreground">
            Internal Notes
          </h3>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-[11px] gap-1 font-medium"
            onClick={onEditNotes}
          >
            <Edit className="size-3" />
            Edit Notes
          </Button>
        </div>
        <p className="font-montserrat text-[12px] text-muted-foreground leading-relaxed">
          {client.notes || "No internal notes added."}
        </p>
      </div>
    </div>
  );
}
