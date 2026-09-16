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
              {client.companyName ? <span>{client.companyName}</span> : null}
              {client.companyName ? <span>•</span> : null}
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
              <DropdownMenuItem onClick={() => openFollowUpModal(client)} className="gap-2">
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
          {/* Awaiting the trips module — an em dash, never a stand-in figure. */}
          <span className="font-montserrat font-bold text-[22px] text-muted-foreground">—</span>
          <span className="font-montserrat text-[11px] text-muted-foreground">once trips are recorded</span>
        </div>

        <div className="p-4 bg-white border border-border rounded-lg shadow-card flex flex-col gap-1">
          <span className="font-montserrat text-[11px] text-muted-foreground uppercase font-medium">Total Spent</span>
          {/* Awaiting invoices and payments. */}
          <span className="font-montserrat font-bold text-[22px] text-muted-foreground">—</span>
          <span className="font-montserrat text-[11px] text-muted-foreground">all time</span>
        </div>

        <div className="p-4 bg-white border border-border rounded-lg shadow-card flex flex-col gap-1">
          <span className="font-montserrat text-[11px] text-muted-foreground uppercase font-medium">Active Quotes</span>
          {/* Awaiting the quotes module. */}
          <span className="font-montserrat font-bold text-[22px] text-muted-foreground">—</span>
          <span className="font-montserrat text-[11px] text-muted-foreground">awaiting response</span>
        </div>

        <div className="p-4 bg-white border border-border rounded-lg shadow-card flex flex-col gap-1">
          <span className="font-montserrat text-[11px] text-muted-foreground uppercase font-medium">Next Follow-up</span>
          <span className="font-montserrat font-bold text-[20px] text-[#D97706] truncate">
            {client.nextFollowUpLabel}
          </span>
          <span className="font-montserrat text-[11px] text-muted-foreground">
            {client.followUpWindowLabel}
          </span>
        </div>
      </div>

      {/* A "flight context" bar sat here showing a client name, broker,
          operator, aircraft, passenger count and route — every value a
          hardcoded string, identical on every client's page and describing a
          trip rather than the client being viewed. It belongs to the Trip
          Command Center, against a real trip. */}

    </div>
  );
}
