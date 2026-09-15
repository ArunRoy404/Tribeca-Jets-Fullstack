"use client";

import Link from "next/link";
import { ArrowLeft, Mail, Phone, Calendar, UserPlus, UserCheck, MoreHorizontal } from "lucide-react";
import StatusBadge from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";

export default function LeadDetailHeader({
  lead,
  onFollowUp,
  onConvert,
  onAssignBroker,
  onDelete,
}) {
  if (!lead) return null;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6 bg-white rounded-lg border border-border shadow-xs w-full">
      <div className="flex items-start sm:items-center gap-3.5">
        <Link
          href="/dashboard/leads-agents"
          className="size-10 rounded-full bg-secondary hover:bg-secondary/80 border border-border flex items-center justify-center text-foreground transition-colors shrink-0 cursor-pointer"
        >
          <ArrowLeft className="size-5" />
        </Link>

        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="font-montserrat font-bold text-[20px] text-foreground leading-tight">
              {lead.name}
            </h1>
            <StatusBadge status={lead.status} bordered />
            <StatusBadge status={lead.priority} bordered />
          </div>

          <div className="flex flex-wrap items-center gap-2 font-montserrat text-[12px] text-muted-foreground">
            {lead.company && (
              <>
                <span className="font-medium text-foreground">{lead.company}</span>
                <span>•</span>
              </>
            )}
            {lead.route && (
              <>
                <span className="font-semibold text-purple">{lead.route}</span>
                <span>•</span>
              </>
            )}
            <span>Broker: {lead.broker}</span>
            <span>•</span>
            <span className="inline-flex items-center gap-1">
              <Mail className="size-3.5 text-muted-foreground" />
              <span>{lead.email}</span>
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1">
              <Phone className="size-3.5 text-muted-foreground" />
              <span>{lead.phone}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Top Header Action Buttons matching Figma */}
      <div className="flex items-center gap-2 sm:self-center self-start shrink-0 flex-wrap">
        <Button
          type="button"
          variant="outline"
          onClick={onFollowUp}
          className="h-9 px-3.5 font-montserrat text-[13px] font-medium gap-1.5 cursor-pointer"
        >
          <Calendar className="size-3.5" />
          <span>Follow-up</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onConvert}
          className="h-9 px-3.5 font-montserrat text-[13px] font-medium gap-1.5 cursor-pointer"
        >
          <UserCheck className="size-3.5" />
          <span>Convert to Client</span>
        </Button>
        <Button
          type="button"
          onClick={onAssignBroker}
          className="h-9 px-4 font-montserrat text-[13px] font-medium bg-[#252832] hover:bg-[#252832]/90 text-white gap-1.5 cursor-pointer"
        >
          <UserPlus className="size-3.5" />
          <span>Assign Broker</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onDelete}
          className="h-9 px-2.5 font-montserrat text-[13px] font-medium text-destructive hover:bg-destructive/10 cursor-pointer"
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </div>
    </div>
  );
}

