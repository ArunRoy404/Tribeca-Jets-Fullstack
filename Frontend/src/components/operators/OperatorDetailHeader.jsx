"use client";

import Link from "next/link";
import { ArrowLeft, Edit, Send, Trash2 } from "lucide-react";
import StatusBadge from "@/components/common/StatusBadge";
import SimpleStatsRow from "@/components/common/SimpleStatsRow";
import { Button } from "@/components/ui/button";

export default function OperatorDetailHeader({ operator, onEdit, onRequestQuote, onRemove }) {
  if (!operator) return null;

  const stats = [
    { label: "RELIABILITY", value: operator.reliability || "4.8", tone: "foreground" },
    { label: "SAFETY", value: operator.safety || "-", tone: "success" },
    {
      label: "RESPONSE SPEED",
      value: operator.responseSpeed === "Fast" ? "-" : operator.responseSpeed || "-",
      tone: "destructive",
    },
    { label: "TOTAL TRIPS", value: operator.totalTrips || "24", tone: "purple" },
    { label: "TOTAL PAID", value: operator.totalPaid || "$0", tone: "success" },
  ];

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Back Link */}
      <Link
        href="/dashboard/operators"
        className="inline-flex items-center gap-1.5 font-montserrat text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft className="size-3.5" />
        Back to Operators
      </Link>

      {/* Profile Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-5 bg-white rounded-xl border border-border shadow-card w-full">
        <div className="flex items-center gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-montserrat font-bold text-[22px] text-foreground leading-tight">
                {operator.name}
              </h1>
              <StatusBadge status={operator.status} bordered />
            </div>
            <p className="font-montserrat text-[13px] text-muted-foreground">
              {operator.homeBase}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
          <Button
            variant="outline"
            className="h-10 text-[13px] gap-2 font-medium flex-1 sm:flex-none"
            onClick={() => onEdit(operator)}
          >
            <Edit className="size-4" />
            Edit
          </Button>

          <Button
            className="bg-[#252832] hover:bg-[#252832]/90 text-white h-10 text-[13px] gap-2 font-medium flex-1 sm:flex-none"
            onClick={() => onRequestQuote(operator)}
          >
            <Send className="size-4" />
            Request Quote
          </Button>

          {/* Soft delete — the operator moves to the Archived tab and every
              trip, quote and payment referencing it keeps working. */}
          <Button
            variant="outline"
            className="h-10 text-[13px] gap-2 font-medium text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive flex-1 sm:flex-none"
            onClick={() => onRemove?.(operator)}
          >
            <Trash2 className="size-4" />
            Remove
          </Button>
        </div>
      </div>

      {/* Reusable SimpleStatsRow */}
      <SimpleStatsRow stats={stats} />
    </div>
  );
}
