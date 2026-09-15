"use client";

import { useMemo } from "react";
import DetailCard from "@/components/trips/DetailCard";
import FormField from "@/components/trips/FormField";
import PickerSelect from "@/components/trips/PickerSelect";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useCreateTripStore } from "@/store/useCreateTripStore";
import {
  leadSourceOptions,
  commissionRecipientOptions,
  paymentStatusOptions,
} from "@/dummyData/createTripOptions";

export default function CreateFinancialsCard() {
  const state = useCreateTripStore();
  const {
    fetApplies,
    clientQuote,
    operatorCost,
    leadSource,
    commissionRecipient,
    commissionAmount,
    paymentStatus,
    setField,
  } = state || {};

  const { fet, estProfit } = useMemo(() => {
    const quote = parseFloat(clientQuote) || 0;
    const cost = parseFloat(operatorCost) || 0;
    const fetValue = fetApplies ? quote * 0.075 : 0;
    return { fet: fetValue, estProfit: quote - cost - fetValue };
  }, [clientQuote, operatorCost, fetApplies]);

  return (
    <DetailCard
      title="Financials"
      description="Enter client quote and operator cost. Profit is calculated automatically."
    >
      <div className="flex items-center justify-between rounded-sm bg-warning/10 px-3 py-2">
        <p className="font-montserrat font-semibold text-[13px] text-warning">FET Applies (7.5%)</p>
        <Switch checked={fetApplies} onCheckedChange={(v) => setField?.("fetApplies", v)} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Client Quote">
          <Input className="h-10 rounded-sm" type="number" placeholder="0" value={clientQuote || ""} onChange={(e) => setField?.("clientQuote", e.target.value)} />
        </FormField>
        <FormField label="Operator Cost">
          <Input className="h-10 rounded-sm" type="number" placeholder="0" value={operatorCost || ""} onChange={(e) => setField?.("operatorCost", e.target.value)} />
        </FormField>
        <FormField label="Lead Source">
          <PickerSelect value={leadSource} onChange={(v) => setField?.("leadSource", v)} options={leadSourceOptions} />
        </FormField>
        <FormField label="Commission Recipient">
          <PickerSelect value={commissionRecipient} onChange={(v) => setField?.("commissionRecipient", v)} options={commissionRecipientOptions} />
        </FormField>
        <FormField label="Commission Amount">
          <Input className="h-10 rounded-sm" type="number" placeholder="$" value={commissionAmount || ""} onChange={(e) => setField?.("commissionAmount", e.target.value)} />
        </FormField>
        <FormField label="Status">
          <PickerSelect value={paymentStatus} onChange={(v) => setField?.("paymentStatus", v)} options={paymentStatusOptions} />
        </FormField>
      </div>

      <div className="flex flex-col gap-2 rounded-sm bg-secondary p-3">
        <div className="flex items-center justify-between">
          <p className="font-montserrat text-[13px] text-muted-foreground">FET (7.5%)</p>
          <p className="font-montserrat font-bold text-[14px] text-foreground">${fet?.toLocaleString?.(undefined, { maximumFractionDigits: 0 }) ?? 0}</p>
        </div>
        <div className="flex items-center justify-between">
          <p className="font-montserrat text-[13px] text-muted-foreground">Est. Profit</p>
          <p className="font-montserrat font-bold text-[14px] text-success">${estProfit?.toLocaleString?.(undefined, { maximumFractionDigits: 0 }) ?? 0}</p>
        </div>
      </div>
    </DetailCard>
  );
}
