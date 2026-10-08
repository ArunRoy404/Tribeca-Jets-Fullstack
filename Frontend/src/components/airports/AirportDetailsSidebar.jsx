"use client";

import { Edit, Trash2, Send, RotateCcw } from "lucide-react";
import { useAirportsStore } from "@/store/useAirportsStore";
import { useAirport, useRestoreAirport } from "@/hooks/airports";
import { usePermissions } from "@/hooks/common/usePermissions";
import { Action, Module } from "@/lib/access";
import { archiveEventLabel } from "@/lib/archive";
import { toAirportRow } from "@/lib/airport";
import DetailSheet from "@/components/common/DetailSheet";
import { Button } from "@/components/ui/button";

const DASH = "—";

function Field({ label, children, accent = false }) {
  return (
    <div className="flex flex-col gap-1 w-full min-w-0">
      <span className="font-montserrat text-[12px] text-muted-foreground">{label}</span>
      <span
        className={`font-montserrat font-bold text-[14px] break-words ${accent ? "text-purple" : "text-foreground"}`}
      >
        {children}
      </span>
    </div>
  );
}

/** "12 · 3 this year", a dash when not counted for this person, "…" while loading. */
function tripsLabel(trips, isPending) {
  if (isPending) return "…";
  if (!trips) return DASH;
  return `${trips.total} · ${trips.thisYear} this year`;
}

export default function AirportDetailsSidebar() {
  const open = useAirportsStore((s) => s.detailsSidebarOpen);
  const selected = useAirportsStore((s) => s.selectedAirport);
  const closeSidebar = useAirportsStore((s) => s.closeDetailsSidebar);
  const openEditModal = useAirportsStore((s) => s.openEditModal);
  const openDeleteModal = useAirportsStore((s) => s.openDeleteModal);
  const { mutate: restoreAirport } = useRestoreAirport();

  // The table row opens the sheet at once; the detail read fills in what
  // only it carries (the trip count) and anything edited since.
  const detail = useAirport(open ? selected?.id : null);
  const airport = detail?.data ? toAirportRow(detail.data) : selected;

  const { canAccess } = usePermissions();
  const mayEdit = canAccess(Module.AIRPORTS, Action.EDIT);
  const mayArchive = canAccess(Module.AIRPORTS, Action.ARCHIVE);

  const handleEdit = () => {
    if (!airport) return;
    closeSidebar();
    openEditModal(airport);
  };

  const handleRemove = () => {
    if (!airport) return;
    closeSidebar();
    openDeleteModal(airport);
  };

  const handleRestore = () => {
    if (!airport) return;
    closeSidebar();
    restoreAirport(airport);
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

  const actions = airport?.isArchived
    ? mayArchive
    : mayEdit || mayArchive;

  return (
    <DetailSheet
      open={open && !!airport}
      onOpenChange={(isOpen) => !isOpen && closeSidebar()}
      resetKey={airport?.id}
      maxWidthClassName="sm:data-[side=right]:max-w-160"
    >
      {airport && (
        <>
          <div className="border-b border-secondary flex items-start justify-between pb-4 w-full">
            <p className="font-montserrat font-bold text-[20px] text-black-text">Airport Details</p>
          </div>

          <div className="flex items-center gap-3 p-3.5 rounded-lg bg-purple/5 border border-purple/20 w-full">
            <div className="size-9 rounded-md bg-white flex items-center justify-center text-purple shadow-xs shrink-0">
              <Send className="size-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-montserrat font-bold text-[14px] text-purple">{airport.icao}</span>
              <span className="font-montserrat font-medium text-[11px] text-muted-foreground">
                IATA {airport.iata || DASH}
              </span>
            </div>
          </div>

          {/* The Archived tab links straight here, so the sheet says what
              happened to the record rather than looking live. */}
          {removedLine || restoredLine ? (
            <div className="flex flex-col gap-0.5 w-full">
              {removedLine ? (
                <span className="font-montserrat text-[12px] text-destructive">{removedLine}</span>
              ) : null}
              {restoredLine ? (
                <span className="font-montserrat text-[12px] text-muted-foreground">{restoredLine}</span>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-col gap-4 p-5 rounded-xl border border-border bg-white shadow-xs w-full">
            <Field label="Airport Name">{airport.name}</Field>

            <div className="grid grid-cols-2 gap-4 w-full pt-1">
              <Field label="City">{airport.city}</Field>
              <Field label="State">{airport.state || DASH}</Field>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full pt-1">
              <Field label="Country">{airport.country}</Field>
              {/* The mapper already renders a missing FBO as an em dash. */}
              <Field label="FBO" accent>{airport.assignedFbo}</Field>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full pt-1">
              <Field label="Longest Runway">{airport.runwayLabel}</Field>
              <Field label="Coordinates">
                {airport.latitude === null && airport.longitude === null
                  ? DASH
                  : `${airport.latitudeLabel}, ${airport.longitudeLabel}`}
              </Field>
            </div>

            <div className="pt-1">
              <Field label="Trips Through Here">{tripsLabel(airport.trips, detail?.isPending)}</Field>
            </div>

            <div className="pt-1 flex flex-col gap-1 w-full">
              <span className="font-montserrat text-[12px] text-muted-foreground">Notes</span>
              <span className="font-montserrat font-bold text-[13px] text-foreground whitespace-pre-line">
                {airport.notes || "No notes on file."}
              </span>
            </div>
          </div>

          {/* Only the actions this person's Airports permissions allow. */}
          {actions ? (
            <div className="border-t border-secondary flex items-center justify-between gap-3 pt-4 w-full mt-auto">
              {airport?.isArchived ? (
                <Button type="button" className="h-10 px-5 gap-2 font-medium text-[13px] rounded-lg" onClick={handleRestore}>
                  <RotateCcw className="size-3.5" />
                  Restore Airport
                </Button>
              ) : (
                <>
                  {mayEdit ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 px-5 gap-2 font-medium text-[13px] border-border text-foreground hover:bg-secondary rounded-lg"
                      onClick={handleEdit}
                    >
                      <Edit className="size-3.5" />
                      Edit
                    </Button>
                  ) : null}
                  {mayArchive ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 px-5 gap-2 font-medium text-[13px] border-destructive/40 text-destructive hover:bg-destructive/10 hover:border-destructive rounded-lg"
                      onClick={handleRemove}
                    >
                      <Trash2 className="size-3.5 text-destructive" />
                      Remove
                    </Button>
                  ) : null}
                </>
              )}
            </div>
          ) : null}
        </>
      )}
    </DetailSheet>
  );
}
