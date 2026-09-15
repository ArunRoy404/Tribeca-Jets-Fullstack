"use client";

import { UserPlus } from "lucide-react";
import DetailCard from "@/components/trips/DetailCard";
import FormField from "@/components/trips/FormField";
import TripTypeToggle from "@/components/trips/TripTypeToggle";
import PickerSelect from "@/components/trips/PickerSelect";
import { Button } from "@/components/ui/button";
import { useCreateTripStore } from "@/store/useCreateTripStore";
import {
  clientOptions,
  brokerOptions,
  statusOptions,
} from "@/dummyData/createTripOptions";

export default function CreateClientTripCard() {
  const state = useCreateTripStore();
  const { client, broker, tripType, status, setField, setTripType } = state || {};

  return (
    <DetailCard title="Client & Trip" description="Select the client and define the trip type and assignment.">
      <FormField label="Client">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1">
            <PickerSelect value={client} onChange={(v) => setField?.("client", v)} options={clientOptions} placeholder="Select existing client..." />
          </div>
          <Button className="gap-2 px-4 shrink-0">
            <UserPlus className="size-3.5" />
            Add New
          </Button>
        </div>
      </FormField>

      <FormField label="Assigned Broker">
        <PickerSelect value={broker} onChange={(v) => setField?.("broker", v)} options={brokerOptions} placeholder="Select broker..." />
      </FormField>

      <div className="flex flex-col sm:flex-row gap-4">
        <FormField label="Trip Type" className="flex-[2] min-w-0">
          <TripTypeToggle value={tripType} onChange={(v) => setTripType?.(v)} />
        </FormField>
        <FormField label="Status" className="w-full sm:w-40 shrink-0">
          <PickerSelect value={status} onChange={(v) => setField?.("status", v)} options={statusOptions} />
        </FormField>
      </div>
    </DetailCard>
  );
}
