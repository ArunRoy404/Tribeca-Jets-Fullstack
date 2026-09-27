"use client";

import { useRouter } from "next/navigation";
import { Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCreateTripStore } from "@/store/useCreateTripStore";
import { useCreateTrip, useUpdateTrip } from "@/hooks/trips";
import { usePermissions } from "@/hooks/common/usePermissions";
import { Permission, Scope } from "@/lib/permissions";
import { optionalNumber, optionalText } from "@/lib/form";

/**
 * Builds the payload from the draft and saves it. Blank optional fields are
 * omitted on create and cleared on edit (`lib/form.js`), and a round trip's
 * return leg is the outbound reversed — the form never asked for its airports.
 */
export default function CreateFormActionBar() {
  const router = useRouter();
  const draft = useCreateTripStore();
  const { mutate: createTrip, isPending: creating } = useCreateTrip();
  const { mutate: updateTrip, isPending: updating } = useUpdateTrip();
  const { scopeFor } = usePermissions();
  const mayAssign = scopeFor(Permission.MANAGE_TRIPS) === Scope.ALL;
  const editing = Boolean(draft.editingId);
  const busy = creating || updating;
  const opts = { editing };

  const buildPayload = (status) => {
    const legs = draft.legs.map((leg) => ({
      ...(leg.id ? { id: leg.id } : {}),
      originAirportId: leg.originAirportId,
      destinationAirportId: leg.destinationAirportId,
      departureDate: optionalText(leg.departureDate, { editing: true }),
      departureTime: optionalText(leg.departureTime, { editing: true }),
    }));
    const passengers = draft.passengers
      .filter((p) => p.fullName.trim())
      .map((p) => ({
        ...(p.id ? { id: p.id } : {}),
        fullName: p.fullName.trim(),
        dateOfBirth: optionalText(p.dateOfBirth, { editing: true }),
        passportNumber: optionalText(p.passportNumber, { editing: true }),
      }));

    return {
      clientId: draft.clientId,
      ...(mayAssign ? { assignedBrokerId: optionalText(draft.assignedBrokerId, opts) } : {}),
      type: draft.type,
      ...(editing ? {} : { status }),
      operatorId: optionalText(draft.operatorId, opts),
      aircraftId: optionalText(draft.aircraftId, opts),
      aircraftDescription: draft.aircraftId ? optionalText("", opts) : optionalText(draft.aircraftDescription, opts),
      operatorConfirmed: Boolean(draft.operatorConfirmed),
      passengerCount: optionalNumber(draft.passengerCount, opts),
      legs,
      passengers,
      basePrice: optionalNumber(draft.basePrice, opts),
      operatorCost: optionalNumber(draft.operatorCost, opts),
      fetEnabled: draft.fetEnabled,
      internalNotes: optionalText(draft.internalNotes, opts),
      clientNotes: optionalText(draft.clientNotes, opts),
      documentUrls: draft.documentUrls ?? [],
    };
  };

  const save = (status) => {
    const payload = buildPayload(status);
    const done = (trip) => {
      draft.reset?.();
      router.push(`/dashboard/trips/${trip?.id}`);
    };
    if (editing) updateTrip({ id: draft.editingId, ...payload }, { onSuccess: done });
    else createTrip(payload, { onSuccess: done });
  };

  const cancel = () => {
    const back = editing ? `/dashboard/trips/${draft.editingId}` : "/dashboard/trips";
    draft.reset?.();
    router.push(back);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-white p-4">
      <Button type="button" variant="outline" className="px-4" onClick={cancel} disabled={busy}>
        Cancel
      </Button>
      {!editing && (
        <Button type="button" variant="outline" className="gap-2 px-4" onClick={() => save("DRAFT")} disabled={busy}>
          <Pencil className="size-3.5" />
          Save as Draft
        </Button>
      )}
      <Button type="button" className="gap-2 px-4 ml-auto" onClick={() => save(draft.status)} disabled={busy}>
        {busy && <Loader2 className="size-3.5 animate-spin" />}
        {editing ? "Save Changes" : "Create Trip"}
      </Button>
    </div>
  );
}
