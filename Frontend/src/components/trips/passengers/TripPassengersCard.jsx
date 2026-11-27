"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import PassengerManifestFields from "./PassengerManifestFields";
import { usePermissions } from "@/hooks/common/usePermissions";
import { useUnsavedChangesGuard } from "@/hooks/common/useUnsavedChangesGuard";
import { useUpdateTrip } from "@/hooks/trips";
import { Action, Module } from "@/lib/access";
import { optionalText } from "@/lib/form";
import { toDateInput, formatCalendarDate } from "@/lib/date";
import DetailCard from "@/components/trips/DetailCard";

const manifestDraft = (trip) => (trip?.passengers ?? []).map((passenger) => ({
  id: passenger?.id,
  fullName: passenger?.fullName ?? "",
  dateOfBirth: toDateInput(passenger?.dateOfBirth),
  passportNumber: passenger?.passportNumber ?? "",
}));

function PassengerEditor({ trip, onDone }) {
  const [initial] = useState(() => manifestDraft(trip));
  const [draft, setDraft] = useState(initial);
  const { mutate: update, isPending } = useUpdateTrip();
  const guard = useUnsavedChangesGuard(JSON.stringify(draft) !== JSON.stringify(initial));
  const save = () => update({
    id: trip?.id,
    passengers: draft.map((p) => ({
      ...(p?.id ? { id: p.id } : {}), fullName: p?.fullName.trim(),
      dateOfBirth: optionalText(p?.dateOfBirth, { editing: true }),
      passportNumber: optionalText(p?.passportNumber, { editing: true }),
    })),
  }, { onSuccess: onDone });

  return (
    <div className="flex flex-col gap-3">
      <fieldset disabled={isPending} className="min-w-0">
        <PassengerManifestFields
          compact passengers={draft}
          updatePassenger={(index, field, value) => setDraft((prev) => prev.map((p, i) => i === index ? { ...p, [field]: value } : p))}
          removePassenger={(index) => setDraft((prev) => prev.filter((_, i) => i !== index))}
          addPassenger={() => setDraft((prev) => [...prev, { fullName: "", dateOfBirth: "", passportNumber: "" }])}
        />
      </fieldset>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={isPending || draft.some((p) => !p?.fullName?.trim())} onClick={save}>Save passengers</Button>
        <Button size="sm" variant="outline" disabled={isPending} onClick={() => guard.requestLeave(onDone)}>Cancel</Button>
      </div>
      <ConfirmDialog {...guard.dialog} />
    </div>
  );
}

/** Manifest fields are shared with the full trip form; writes use its endpoint. */
export default function TripPassengersCard({ trip, editing, onEdit, onDone }) {
  const { canAccess } = usePermissions();
  const mayEdit = canAccess(Module.TRIPS, Action.EDIT) && trip?.editable && !trip?.isArchived;
  const passengers = trip?.passengers ?? [];

  return (
    <DetailCard
      title={`Passengers${passengers.length ? ` · ${passengers.length}` : ""}`}
      action={mayEdit && !editing ? <Button size="sm" variant="outline" onClick={onEdit}>Edit</Button> : undefined}
    >
      {editing && mayEdit ? (
        <PassengerEditor key={trip?.id} trip={trip} onDone={onDone} />
      ) : passengers.length === 0 ? (
        <p className="font-montserrat text-[12px] text-muted-foreground">No named passengers yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {passengers.map((p) => {
            const hasDetails = Boolean(p?.dateOfBirth || p?.passportNumber);
            return (
              <div key={p?.id} className="flex flex-col gap-0.5">
                <p className="font-montserrat font-semibold text-[13px] text-foreground">{p?.fullName}</p>
                {hasDetails ? (
                  <p className="font-montserrat text-[11px] text-muted-foreground">
                    {p?.dateOfBirth ? `Born ${formatCalendarDate(p.dateOfBirth)}` : "DOB not on file"}
                    {" · "}
                    {p?.passportNumber ? `Passport ${p.passportNumber}` : "No passport on file"}
                  </p>
                ) : (
                  <p className="font-montserrat text-[11px] text-muted-foreground">Companion</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </DetailCard>
  );
}
