"use client";

import Link from "next/link";
import { ArrowLeft, Mail, Phone, Edit, UserPlus, MoreHorizontal } from "lucide-react";
import StatusBadge from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";

export default function AgentDetailHeader({ agent, onEdit, onAssignLead }) {
  if (!agent) return null;

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
              {agent.name}
            </h1>
            <StatusBadge status={agent.status} bordered />
          </div>

          <div className="flex flex-wrap items-center gap-2 font-montserrat text-[12px] text-muted-foreground">
            {agent.company && (
              <>
                <span className="font-medium text-foreground">{agent.company}</span>
                <span>•</span>
              </>
            )}
            <span className="inline-flex items-center gap-1">
              <Mail className="size-3.5 text-muted-foreground" />
              <span>{agent.contactEmail || agent.email}</span>
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1">
              <Phone className="size-3.5 text-muted-foreground" />
              <span>{agent.contactPhone || agent.phone}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 sm:self-center self-start shrink-0">
        <Button
          type="button"
          variant="outline"
          onClick={onEdit}
          className="h-9 px-3.5 font-montserrat text-[13px] font-medium gap-1.5 cursor-pointer"
        >
          <Edit className="size-3.5" />
          <span>Edit Agent</span>
        </Button>
        <Button
          type="button"
          onClick={onAssignLead}
          className="h-9 px-4 font-montserrat text-[13px] font-medium bg-[#252832] hover:bg-[#252832]/90 text-white gap-1.5 cursor-pointer"
        >
          <UserPlus className="size-3.5" />
          <span>Assign Lead</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => alert(`More actions for ${agent.name}`)}
          className="h-9 px-2.5 font-montserrat text-[13px] font-medium cursor-pointer"
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </div>
    </div>
  );
}

