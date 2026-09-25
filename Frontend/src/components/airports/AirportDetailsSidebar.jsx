"use client";

import { Edit, Trash2, Send, RotateCcw } from "lucide-react";
import { useAirportsStore } from "@/store/useAirportsStore";
import { useRestoreAirport } from "@/hooks/airports";
import { archiveEventLabel } from "@/lib/archive";
import DetailSheet from "@/components/common/DetailSheet";
import { Button } from "@/components/ui/button";

export default function AirportDetailsSidebar() {
  const open = useAirportsStore((s) => s.detailsSidebarOpen);
  const airport = useAirportsStore((s) => s.selectedAirport);
  const closeSidebar = useAirportsStore((s) => s.closeDetailsSidebar);
  const openEditModal = useAirportsStore((s) => s.openEditModal);
  const openDeleteModal = useAirportsStore((s) => s.openDeleteModal);
  const { mutate: restoreAirport } = useRestoreAirport();

  const handleEdit = () => {
    if (airport) {
      closeSidebar();
      openEditModal(airport);
    }
  };

  const handleDelete = () => {
    if (airport) {
      closeSidebar();
      openDeleteModal(airport);
    }
  };

  // Both can be present: a record restored and later archived again keeps
  // `restoredAt`. Read directly rather than through `isRestored`, which is
  // false while a record is archived.
  const removedLine = airport?.isArchived
    ? archiveEventLabel("Removed", airport?.deletedAtLabel, airport?.deletedByName)
    : null;
  const restoredLine = airport?.restoredAt
    ? archiveEventLabel(
        airport?.isArchived ? "Previously restored" : "Restored",
        airport?.restoredAtLabel,
        airport?.restoredByName,
      )
    : null;

  const handleRestore = () => {
    if (airport) {
      closeSidebar();
      restoreAirport(airport);
    }
  };

  return (
    <DetailSheet
      open={open && !!airport}
      onOpenChange={(isOpen) => !isOpen && closeSidebar()}
      resetKey={airport?.id}
      maxWidthClassName="sm:data-[side=right]:max-w-160"
    >
      {airport && (
        <>
          {/* Header matching SourcingRequestDetailSheet */}
          <div className="border-b border-secondary flex items-start justify-between pb-4 w-full">
            <div className="flex flex-col gap-1 items-start">
              <p className="font-montserrat font-bold text-[20px] text-black-text">Airport Details</p>
            </div>
          </div>

          {/* Top Purple Banner Badge */}
          <div className="flex items-center gap-3 p-3.5 rounded-lg bg-[#F5F3FF] border border-[#E9D5FF]/60 w-full">
            <div className="size-9 rounded-md bg-white flex items-center justify-center text-purple shadow-xs shrink-0">
              <Send className="size-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-montserrat font-bold text-[14px] text-purple">
                {airport.icao}
              </span>
              <span className="font-montserrat font-medium text-[11px] text-muted-foreground">
                IATA {airport.iata}
              </span>
            </div>
          </div>

          {/* The Archived tab links straight here, so the sheet says what
              happened to the record rather than looking live. */}
          {removedLine || restoredLine ? (
            <div className="flex flex-col gap-0.5 w-full">
              {removedLine ? (
                <span className="font-montserrat text-[12px] text-destructive">
                  {removedLine}
                </span>
              ) : null}
              {restoredLine ? (
                <span className="font-montserrat text-[12px] text-muted-foreground">
                  {restoredLine}
                </span>
              ) : null}
            </div>
          ) : null}

          {/* White Details Box from Figma */}
          <div className="flex flex-col gap-4 p-5 rounded-xl border border-border bg-white shadow-xs w-full">
            {/* Airport Name */}
            <div className="flex flex-col gap-1 w-full">
              <span className="font-montserrat text-[12px] text-muted-foreground">Airport Name</span>
              <span className="font-montserrat font-bold text-[14px] text-foreground">{airport.name}</span>
            </div>

            {/* City & State (2-column) */}
            <div className="grid grid-cols-2 gap-4 w-full pt-1">
              <div className="flex flex-col gap-1 w-full">
                <span className="font-montserrat text-[12px] text-muted-foreground">City</span>
                <span className="font-montserrat font-bold text-[14px] text-foreground">{airport.city}</span>
              </div>
              <div className="flex flex-col gap-1 w-full">
                <span className="font-montserrat text-[12px] text-muted-foreground">State</span>
                <span className="font-montserrat font-bold text-[14px] text-foreground">{airport.state || "—"}</span>
              </div>
            </div>

            {/* Country & FBO (2-column) */}
            <div className="grid grid-cols-2 gap-4 w-full pt-1">
              <div className="flex flex-col gap-1 w-full">
                <span className="font-montserrat text-[12px] text-muted-foreground">Country</span>
                <span className="font-montserrat font-bold text-[14px] text-foreground">{airport.country}</span>
              </div>
              <div className="flex flex-col gap-1 w-full">
                <span className="font-montserrat text-[12px] text-muted-foreground">FBO</span>
                <span className="font-montserrat font-bold text-[14px] text-purple">
                  {airport.assignedFbo || "Signature Flight Support"}
                </span>
              </div>
            </div>

            {/* Notes */}
            <div className="pt-1 flex flex-col gap-1 w-full">
              <span className="font-montserrat text-[12px] text-muted-foreground">Notes</span>
              <span className="font-montserrat font-bold text-[13px] text-foreground">
                {airport.notes || "Primary departure airport for NYC clients."}
              </span>
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div className="border-t border-secondary flex items-center justify-between gap-3 pt-4 w-full mt-auto">
            {airport?.isArchived ? (
              <Button
                type="button"
                className="h-10 px-5 gap-2 font-medium text-[13px] bg-[#252832] hover:bg-[#252832]/90 text-white rounded-lg"
                onClick={handleRestore}
              >
                <RotateCcw className="size-3.5" />
                Restore Airport
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 px-5 gap-2 font-medium text-[13px] border-border text-foreground hover:bg-secondary rounded-lg"
                  onClick={handleEdit}
                >
                  <Edit className="size-3.5" />
                  Edit
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="h-10 px-5 gap-2 font-medium text-[13px] border-destructive/40 text-destructive hover:bg-destructive/10 hover:border-destructive rounded-lg"
                  onClick={handleDelete}
                >
                  <Trash2 className="size-3.5 text-destructive" />
                  Delete
                </Button>
              </>
            )}
          </div>
        </>
      )}
    </DetailSheet>
  );
}
