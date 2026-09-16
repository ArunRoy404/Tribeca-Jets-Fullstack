"use client";

import Link from "next/link";
import { ArrowLeft, Mail, Phone } from "lucide-react";
import StatusBadge from "@/components/common/StatusBadge";
import { formatUserRole } from "@/lib/user";

/**
 * An agent is a User, so there are no edit controls here: role, status and
 * permissions are changed in Users & Roles, where the permission matrix and
 * the suspend rules live. Two places to edit one record would drift.
 */
export default function AgentDetailHeader({ agent }) {
  if (!agent) return null;

  return (
    <div className="flex flex-col gap-6 w-full">
      <Link
        href="/dashboard/leads-agents"
        className="inline-flex items-center gap-1.5 font-montserrat text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft className="size-3.5" />
        Back to Agents
      </Link>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-5 bg-white rounded-xl border border-border shadow-card w-full">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-montserrat font-bold text-[22px] text-foreground leading-tight">
              {agent.name}
            </h1>
            {agent.status ? <StatusBadge status={agent.status} bordered /> : null}
          </div>
          <p className="font-montserrat text-[13px] text-muted-foreground">
            {formatUserRole(agent.role)}
          </p>
          <div className="flex items-center gap-4 flex-wrap pt-1 font-montserrat text-[12px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Mail className="size-3.5" />
              {agent.email}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Phone className="size-3.5" />
              {agent.phone}
            </span>
          </div>
        </div>

        <p className="font-montserrat text-[12px] text-muted-foreground shrink-0">
          Role and status are managed in Users &amp; Roles.
        </p>
      </div>
    </div>
  );
}
