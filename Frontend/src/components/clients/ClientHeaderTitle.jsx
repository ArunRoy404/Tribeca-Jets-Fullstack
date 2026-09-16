"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import StatusBadge from "@/components/common/StatusBadge";

export default function ClientHeaderTitle({ client, backUrl = "/dashboard/clients" }) {
  if (!client) return null;

  const initials = client.name
    ? client.name
        .split(" ")
        .map((n) => n[0])
        .join("")
    : "CL";

  return (
    <div className="flex flex-col gap-3 w-full">
      <Link
        href={backUrl}
        className="inline-flex items-center gap-1.5 font-montserrat text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft className="size-3.5" />
        Back to Clients
      </Link>

      <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
        <div className="size-12 sm:size-14 rounded-full bg-[#F3F4F6] text-foreground flex items-center justify-center font-montserrat font-bold text-[18px] sm:text-[20px] border border-border shrink-0">
          {initials}
        </div>
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-montserrat font-bold text-[20px] sm:text-[22px] text-foreground leading-tight">
              {client.name}
            </h1>
            <StatusBadge status={client.status || "VIP"} bordered />
          </div>
          <p className="font-montserrat text-[12px] sm:text-[13px] text-muted-foreground flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {client.company && client.company !== "—" ? (
              <>
                <span>{client.company}</span>
                <span>•</span>
              </>
            ) : null}
            <span>{client.type || "Direct"} Client</span>
            <span>•</span>
            <span>Broker: {client.broker || "Barry"}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
