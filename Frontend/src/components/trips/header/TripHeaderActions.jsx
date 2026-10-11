"use client";

import { useRouter } from "next/navigation";
import { Pencil, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRemoveTrip, useRestoreTrip } from "@/hooks/trips";
import { usePermissions } from "@/hooks/common/usePermissions";
import { Action, Module } from "@/lib/access";

/**
 * Edit and archive. Hidden, not disabled, for a role that cannot — and Edit
 * is absent on a completed or cancelled trip, which is history until it is
 * moved back a step. An archived trip offers Restore and nothing else.
 */
export default function TripHeaderActions({ trip }) {
  const router = useRouter();
  const { canAccess } = usePermissions();
  const mayEdit = canAccess(Module.TRIPS, Action.EDIT);
  const mayArchive = canAccess(Module.TRIPS, Action.ARCHIVE);
  const { mutate: remove, isPending: removing } = useRemoveTrip();
  const { mutate: restore, isPending: restoring } = useRestoreTrip();

  if (trip?.isArchived) {
    return mayArchive ? (
      <Button variant="outline" className="gap-2 px-4" onClick={() => restore?.(trip?.id)} disabled={restoring}>
        <RotateCcw className="size-3.5" />
        Restore
      </Button>
    ) : null;
  }

  return (
    <div className="flex items-center gap-2">
      {mayEdit && trip?.editable && (
        <Button variant="outline" className="gap-2 px-4" onClick={() => router.push(`/dashboard/trips/${trip?.id}/edit`)}>
          <Pencil className="size-3.5" />
          Edit
        </Button>
      )}
      {mayArchive && (
        <Button
          variant="outline"
          className="gap-2 px-4 text-destructive"
          disabled={removing}
          onClick={() => remove?.(trip?.id, { onSuccess: () => router.push("/dashboard/trips") })}
        >
          <Trash2 className="size-3.5" />
          Archive
        </Button>
      )}
    </div>
  );
}
