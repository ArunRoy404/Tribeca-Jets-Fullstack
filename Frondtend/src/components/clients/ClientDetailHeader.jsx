"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Edit, Plus, MoreHorizontal, Archive, Calendar } from "lucide-react";
import StatusBadge from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { useClientsStore } from "@/store/useClientsStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ClientDetailHeader({ client }) {
  const router = useRouter();
  const openEditModal = useClientsStore((s) => s.openEditModal);
  const openFollowUpModal = useClientsStore((s) => s.openFollowUpModal);
  const openArchiveModal = useClientsStore((s) => s.openArchiveModal);

  if (!client) return null;

  const initials = client.name
    .split(" ")
    .map((n) => n[0])
    .join("");

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Back Link */}
      <Link
        href="/dashboard/clients"
        className="inline-flex items-center gap-1.5 font-montserrat text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft className="size-3.5" />
        Back to Clients
      </Link>

      {/* Profile Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-5 bg-white rounded-xl border border-border shadow-card w-full">
        <div className="flex items-center gap-4">
          <div className="size-14 rounded-full bg-[#F3F4F6] text-foreground flex items-center justify-center font-montserrat font-bold text-[20px] border border-border shrink-0">
            {initials}
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-montserrat font-bold text-[22px] text-foreground leading-tight">
                {client.name}
              </h1>
              <StatusBadge status={client.status} bordered />
            </div>
            <p className="font-montserrat text-[13px] text-muted-foreground flex items-center gap-2 flex-wrap">
              {client.company && <span>{client.company}</span>}
              {client.company && <span>•</span>}
              <span>{client.type} Client</span>
              <span>•</span>
              <span>Broker: {client.broker}</span>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
          <Button
            variant="outline"
            className="h-10 text-[13px] gap-2 font-medium flex-1 sm:flex-none"
            onClick={() => openEditModal(client)}
          >
            <Edit className="size-4" />
            Edit Client
          </Button>

          <Button
            className="bg-[#252832] hover:bg-[#252832]/90 text-white h-10 text-[13px] gap-2 font-medium flex-1 sm:flex-none"
            onClick={() => router.push("/dashboard/trips/new")}
          >
            <Plus className="size-4" />
            Create Trip
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-10 px-3 shrink-0 gap-1.5 cursor-pointer">
                <MoreHorizontal className="size-4" />
                <span className="sr-only sm:not-sr-only text-[13px]">More</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 font-montserrat text-[12px]">
              <DropdownMenuItem onClick={() => openFollowUpModal(client.id)} className="gap-2">
                <Calendar className="size-3.5" />
                Schedule Follow-up
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openEditModal(client)} className="gap-2">
                <Edit className="size-3.5" />
                Edit Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => openArchiveModal(client)} className="gap-2 text-destructive focus:text-destructive">
                <Archive className="size-3.5" />
                Archive Client
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 4 Stat Summary KPI Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        <div className="p-4 bg-white border border-border rounded-lg shadow-card flex flex-col gap-1">
          <span className="font-montserrat text-[11px] text-muted-foreground uppercase font-medium">Total Trips</span>
          <span className="font-montserrat font-bold text-[22px] text-foreground">{client.totalTrips || 18}</span>
          <span className="font-montserrat text-[11px] text-muted-foreground">{client.tripsOnRecord || 6} on record</span>
        </div>

        <div className="p-4 bg-white border border-border rounded-lg shadow-card flex flex-col gap-1">
          <span className="font-montserrat text-[11px] text-muted-foreground uppercase font-medium">Total Spent</span>
          <span className="font-montserrat font-bold text-[22px] text-[#00B274]">{client.totalSpent || "$485,000"}</span>
          <span className="font-montserrat text-[11px] text-muted-foreground">all time</span>
        </div>

        <div className="p-4 bg-white border border-border rounded-lg shadow-card flex flex-col gap-1">
          <span className="font-montserrat text-[11px] text-muted-foreground uppercase font-medium">Active Quotes</span>
          <span className="font-montserrat font-bold text-[22px] text-[#F59E0B]">{client.activeQuotesCount || 1}</span>
          <span className="font-montserrat text-[11px] text-muted-foreground">awaiting response</span>
        </div>

        <div className="p-4 bg-white border border-border rounded-lg shadow-card flex flex-col gap-1">
          <span className="font-montserrat text-[11px] text-muted-foreground uppercase font-medium">Next Follow-up</span>
          <span className="font-montserrat font-bold text-[20px] text-[#D97706] truncate">
            {client.nextFollowUpDate || "Aug 12, 2026"}
          </span>
          <span className="font-montserrat text-[11px] text-muted-foreground">Upcoming</span>
        </div>
      </div>

      {/* Top Sub-Header Flight Context Bar matching Figma frame */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 p-3 px-4 bg-white rounded-lg border border-border text-[12px] font-montserrat w-full">
        <div className="flex flex-col">
          <span className="text-[10px] text-muted-foreground uppercase font-medium">Client</span>
          <span className="font-bold text-foreground">Kevin Monroe</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-muted-foreground uppercase font-medium">Trip Type</span>
          <span className="font-bold text-foreground">One Way</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-muted-foreground uppercase font-medium">Broker</span>
          <span className="font-bold text-foreground">Mark</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-muted-foreground uppercase font-medium">Operator</span>
          <span className="font-bold text-foreground">Flexjet</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-muted-foreground uppercase font-medium">Aircraft</span>
          <span className="font-bold text-foreground">Global 7500</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-muted-foreground uppercase font-medium">Passengers</span>
          <span className="font-bold text-foreground">4</span>
        </div>
        <div className="flex flex-col col-span-2 sm:col-span-2 lg:col-span-1">
          <span className="text-[10px] text-muted-foreground uppercase font-medium">Departure / Arrival</span>
          <span className="font-bold text-foreground truncate">JFK → LHR • Aug 1</span>
        </div>
      </div>
    </div>
  );
}
