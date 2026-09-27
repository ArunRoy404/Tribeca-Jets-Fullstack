"use client";

import DetailCard from "@/components/trips/DetailCard";
import FormField from "@/components/trips/FormField";
import TripTypeToggle from "@/components/trips/TripTypeToggle";
import PickerSelect from "@/components/trips/PickerSelect";
import { useCreateTripStore } from "@/store/useCreateTripStore";
import { usePermissions } from "@/hooks/common/usePermissions";
import { Permission, Scope } from "@/lib/permissions";
import { formatTripStatus } from "@/lib/trip";

/** A trip is created in one of these; the rest of its life is the lifecycle actions. */
const CREATE_STATUSES = ["DRAFT", "BOOKED", "CONFIRMED"].map((value) => ({ value, label: formatTripStatus(value) }));

export default function CreateClientTripCard({ options }) {
  const { clientId, assignedBrokerId, type, status, editingId, setField, setType } = useCreateTripStore();
  const { scopeFor } = usePermissions();
  // Assigning a trip to someone else is an administrator's call — the same
  // line the API draws. Hidden, not disabled, and never sent by a broker.
  const mayAssign = scopeFor(Permission.MANAGE_TRIPS) === Scope.ALL;

  return (
    <DetailCard title="Client & Trip" description="Who is flying, who owns it, and the shape of the trip.">
      <FormField label="Client">
        <PickerSelect value={clientId} onChange={(v) => setField?.("clientId", v)} options={options?.clients} placeholder="Select client..." />
      </FormField>

      {mayAssign && (
        <FormField label="Assigned Broker (Optional)">
          <PickerSelect
            value={assignedBrokerId}
            onChange={(v) => setField?.("assignedBrokerId", v)}
            options={options?.brokers}
            placeholder="You, unless you choose someone"
          />
        </FormField>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        <FormField label="Trip Type" className="flex-[2] min-w-0">
          <TripTypeToggle value={type} onChange={(v) => setType?.(v)} />
        </FormField>
        {/* A new trip picks where it starts; after that its status moves only
            through the lifecycle actions on the trip page. */}
        {!editingId && (
          <FormField label="Status" className="w-full sm:w-40 shrink-0">
            <PickerSelect value={status} onChange={(v) => setField?.("status", v)} options={CREATE_STATUSES} />
          </FormField>
        )}
      </div>
    </DetailCard>
  );
}
