"use client";

import Link from "next/link";
import { ArrowLeft, Edit, Wrench, CheckCircle2 } from "lucide-react";
import StatusBadge from "@/components/common/StatusBadge";
import SimpleStatsRow from "@/components/common/SimpleStatsRow";
import { Button } from "@/components/ui/button";

export default function AircraftDetailHeader({ aircraft, onEdit, onToggleMaintenance }) {
  if (!aircraft) return null;

  const isMaintenance = aircraft.status === "Maintenance";

  const stats = [
    { label: "TAIL NUMBER", value: aircraft.tail, tone: "purple" },
    { label: "TYPE", value: aircraft.category, tone: "foreground" },
    { label: "CAPACITY", value: aircraft.capacity, tone: "foreground" },
    { label: "RANGE", value: `${aircraft.rangeNm} nm`, tone: "success" },
  ];

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Back Link */}
      <Link
        href="/dashboard/aircraft"
        className="inline-flex items-center gap-1.5 font-montserrat text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft className="size-3.5" />
        Back to Aircraft
      </Link>

      {/* Profile Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-5 bg-white rounded-xl border border-border shadow-card w-full">
        <div className="flex items-center gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-montserrat font-bold text-[22px] text-foreground leading-tight">
                {aircraft.model}
              </h1>
              <StatusBadge status={aircraft.status} bordered />
            </div>
            <p className="font-montserrat text-[13px] text-muted-foreground">
              {aircraft.tail} · {aircraft.operator} · {aircraft.category}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
          <Button
            variant="outline"
            className="h-10 text-[13px] gap-2 font-medium flex-1 sm:flex-none"
            onClick={() => onEdit(aircraft)}
          >
            <Edit className="size-4" />
            Edit
          </Button>

          <Button
            className="bg-[#252832] hover:bg-[#252832]/90 text-white h-10 text-[13px] gap-2 font-medium flex-1 sm:flex-none"
            onClick={() => onToggleMaintenance(aircraft)}
          >
            {isMaintenance ? <CheckCircle2 className="size-4" /> : <Wrench className="size-4" />}
            {isMaintenance ? "Mark Available" : "Set Maintenance"}
          </Button>
        </div>
      </div>

      {/* Reusable SimpleStatsRow */}
      <SimpleStatsRow stats={stats} />
    </div>
  );
}
