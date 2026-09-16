"use client";

import { CheckCircle2, Plane, Wrench, PauseCircle, X } from "lucide-react";
import { useAircraftStore } from "@/store/useAircraftStore";
import { useUpdateAircraft } from "@/hooks/aircraft";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * Sets an aircraft's status — all four of them.
 *
 * This replaced a dialog that toggled between AVAILABLE and MAINTENANCE and
 * nothing else, which left IN_SERVICE and INACTIVE reachable only by opening
 * the Edit form and finding the dropdown. It was also wrong for a tail that
 * was already inactive: the button read "Set Maintenance", so the one quick
 * action on the row would ground an aircraft that had left the fleet.
 *
 * Each option carries what it means. The four are easy to confuse, and the
 * difference between "Inactive" and removing the row is the one people get
 * wrong — hence the footnote.
 */
const OPTIONS = [
  {
    value: "AVAILABLE",
    label: "Available",
    description: "Ready to quote. Offered for new trips.",
    icon: CheckCircle2,
    tone: "text-success",
  },
  {
    value: "IN_SERVICE",
    label: "In Service",
    description: "Currently flying a trip.",
    icon: Plane,
    tone: "text-info",
  },
  {
    value: "MAINTENANCE",
    label: "Maintenance",
    description: "Grounded. Will not be quoted until it returns.",
    icon: Wrench,
    tone: "text-warning",
  },
  {
    value: "INACTIVE",
    label: "Inactive",
    description: "Out of the fleet, but still listed and searchable.",
    icon: PauseCircle,
    tone: "text-destructive",
  },
];

export default function ChangeStatusDialog() {
  const open = useAircraftStore((s) => s.statusModalOpen);
  const target = useAircraftStore((s) => s.statusTargetAircraft);
  const closeModal = useAircraftStore((s) => s.closeStatusModal);
  const { mutate: updateAircraft, isPending } = useUpdateAircraft();

  if (!target) return null;

  // The enum constant, not the display label — "Maintenance" is what the UI
  // shows, `MAINTENANCE` is what the API stores.
  const current = target.rawStatus;
  const aircraftName = `${target.model} (${target.tailNumber})`;

  const handleSelect = (status) => {
    if (status === current) {
      closeModal();
      return;
    }
    updateAircraft({ id: target.id, status }, { onSuccess: closeModal });
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && closeModal()}>
      <DialogContent className="sm:max-w-125 p-6 flex flex-col gap-4">
        <DialogHeader className="flex flex-col items-start gap-1 w-full">
          <DialogTitle className="font-montserrat font-bold text-[18px] text-foreground text-left">
            Change Status
          </DialogTitle>
          <DialogDescription className="font-montserrat text-[13px] text-muted-foreground text-left leading-relaxed">
            <span className="font-bold text-foreground">{aircraftName}</span> is
            currently{" "}
            <span className="font-bold text-foreground">
              {OPTIONS.find((option) => option.value === current)?.label ?? "—"}
            </span>
            .
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 w-full">
          {OPTIONS.map((option) => {
            const Icon = option.icon;
            const isCurrent = option.value === current;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                disabled={isPending}
                className={`flex items-start gap-3 p-3 w-full rounded-md border text-left transition-colors disabled:opacity-60 ${
                  isCurrent
                    ? "border-purple bg-purple/5"
                    : "border-border bg-background hover:bg-secondary/60"
                }`}
              >
                <Icon className={`size-4.5 shrink-0 mt-0.5 ${option.tone}`} />
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="font-montserrat font-bold text-[13px] text-foreground">
                    {option.label}
                    {isCurrent ? (
                      <span className="font-normal text-muted-foreground"> · current</span>
                    ) : null}
                  </span>
                  <span className="font-montserrat text-[12px] text-muted-foreground">
                    {option.description}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <p className="font-montserrat text-[12px] text-muted-foreground leading-relaxed border-t border-border pt-3">
          None of these removes the aircraft.{" "}
          <span className="font-semibold text-foreground">Inactive</span> keeps
          it in the list with its history; removing it moves it to the Archived
          tab.
        </p>

        <div className="flex items-center justify-end w-full">
          <Button
            type="button"
            variant="outline"
            className="gap-1.5 px-4 h-10 font-medium text-[13px]"
            onClick={closeModal}
            disabled={isPending}
          >
            <X className="size-4" />
            {isPending ? "Saving…" : "Cancel"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
