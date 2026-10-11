"use client";

import DetailCard from "@/components/trips/DetailCard";
import FormField from "@/components/trips/FormField";
import TripTypeToggle from "@/components/trips/TripTypeToggle";
import ClientPicker from "@/components/clients/ClientPicker";
import BrokerPicker from "@/components/users/BrokerPicker";
import CommonSelect from "@/components/common/CommonSelect";
import { useCreateTripStore } from "@/store/useCreateTripStore";
import { usePermissions } from "@/hooks/common/usePermissions";
import { useCurrentUser } from "@/hooks/auth";
import { useClient } from "@/hooks/clients";
import { Action, Module, Reach } from "@/lib/access";
import { isAdministratorRole } from "@/lib/roles";
import { formatTripStatus } from "@/lib/trip";
import { formatLeadSource } from "@/lib/lead";

/** A trip is created in one of these; the rest of its life is the lifecycle actions. */
const CREATE_STATUSES = ["DRAFT", "BOOKED", "CONFIRMED"].map((value) => ({
  value,
  label: formatTripStatus(value),
}));

export default function CreateClientTripCard() {
  const {
    clientId,
    assignedBrokerId,
    type,
    status,
    editingId,
    legs,
    setField,
    setType,
    updateLeg,
  } = useCreateTripStore();

  const { canAccess, reachOf } = usePermissions();
  const { data: currentUser } = useCurrentUser();
  const { data: client } = useClient(clientId);

  // Assigning a trip to someone else needs TRIPS · ASSIGN, ALL reach, or Super Admin/Admin.
  const mayAssign =
    canAccess(Module.TRIPS, Action.ASSIGN) ||
    reachOf(Module.TRIPS) === Reach.ALL ||
    isAdministratorRole(currentUser?.role);

  const handleClientChange = (val, rawClient) => {
    setField?.("clientId", val || "");
    if (rawClient) {
      if (rawClient.assignedBrokerId && mayAssign) {
        setField?.("assignedBrokerId", rawClient.assignedBrokerId);
      }
      if (rawClient.homeAirportId && !legs?.[0]?.originAirportId) {
        updateLeg?.(0, "originAirportId", rawClient.homeAirportId);
      }
    }
  };

  return (
    <DetailCard
      title="Client & Trip"
      description="Who is flying, who owns it, and the shape of the trip."
    >
      <FormField label="Client">
        <ClientPicker
          value={clientId}
          onChange={handleClientChange}
          placeholder="Select client..."
        />
        {client && (
          <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-muted-foreground font-montserrat">
            <span>Lead Source:</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-secondary text-foreground">
              {formatLeadSource(client.leadSource) || "Direct"}
            </span>
            {client.companyName && (
              <>
                <span>·</span>
                <span>{client.companyName}</span>
              </>
            )}
          </div>
        )}
      </FormField>

      {mayAssign && (
        <FormField label="Assigned Broker (Optional)">
          <BrokerPicker
            value={assignedBrokerId}
            onChange={(v) => setField?.("assignedBrokerId", v || "")}
            placeholder="You, unless you choose someone"
            allowClear
            clearLabel="None (Unassigned)"
          />
        </FormField>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        <FormField label="Trip Type" className="flex-[2] min-w-0">
          <TripTypeToggle value={type} onChange={(v) => setType?.(v)} />
        </FormField>
        {!editingId && (
          <FormField label="Status" className="w-full sm:w-40 shrink-0">
            <CommonSelect
              value={status}
              onChange={(v) => setField?.("status", v)}
              options={CREATE_STATUSES}
            />
          </FormField>
        )}
      </div>
    </DetailCard>
  );
}

