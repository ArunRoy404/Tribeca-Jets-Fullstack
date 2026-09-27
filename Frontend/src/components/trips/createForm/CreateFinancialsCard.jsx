"use client";

import { useEffect, useState } from "react";
import DetailCard from "@/components/trips/DetailCard";
import FormField from "@/components/trips/FormField";
import SuggestedPricePicker from "@/components/quotes/pricing/SuggestedPricePicker";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useCreateTripStore } from "@/store/useCreateTripStore";
import { useQuotePricePreview } from "@/hooks/quotes";
import { usePermissions } from "@/hooks/common/usePermissions";
import { Permission } from "@/lib/permissions";
import { optionalNumber } from "@/lib/form";
import { formatMoney } from "@/lib/money";

/**
 * The trip's price. FET, total and profit are the **server's** figures, from
 * the same price preview the quote form uses — this card used to multiply by
 * 0.075 itself, a second copy of the pricing rule that would disagree with
 * the server the first time a rate changed.
 *
 * Commission and payment status left this card: commissions are recorded on
 * the trip once it exists (Commissions module), and payments belong to
 * Receivables (#16). Fields for either here would be stored nowhere.
 */
export default function CreateFinancialsCard() {
  const { basePrice, operatorCost, fetEnabled, setField } = useCreateTripStore();
  const { canWrite } = usePermissions();
  const seesFinancials = canWrite(Permission.VIEW_FINANCIALS);

  const { mutate: preview } = useQuotePricePreview();
  const [priced, setPriced] = useState(null);
  const base = optionalNumber(basePrice);

  useEffect(() => {
    if (base === undefined) return undefined;
    const handle = setTimeout(() => {
      preview(
        { basePrice: base, fetEnabled, operatorCost: optionalNumber(operatorCost) },
        { onSuccess: (data) => setPriced({ ...data, forBase: base }), onError: () => setPriced(null) },
      );
    }, 400);
    return () => clearTimeout(handle);
  }, [base, operatorCost, fetEnabled, preview]);

  const current = base !== undefined && priced?.forBase === base ? priced : null;

  return (
    <DetailCard title="Financials" description="The client's price and the operator's cost. FET and profit are worked out by the server.">
      <div className="flex items-center justify-between rounded-sm bg-warning/10 px-3 py-2">
        <p className="font-montserrat font-semibold text-[13px] text-warning">FET applies (7.5%)</p>
        <Switch checked={fetEnabled} onCheckedChange={(v) => setField?.("fetEnabled", v)} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Client Price, before FET (Optional)">
          <Input className="h-10 rounded-sm" type="number" min="0" placeholder="e.g. 80000" value={basePrice || ""} onChange={(e) => setField?.("basePrice", e.target.value)} />
        </FormField>
        {seesFinancials && (
          <FormField label="Operator Cost (Optional)">
            <Input className="h-10 rounded-sm" type="number" min="0" placeholder="e.g. 65000" value={operatorCost || ""} onChange={(e) => setField?.("operatorCost", e.target.value)} />
          </FormField>
        )}
      </div>

      {seesFinancials && (
        <SuggestedPricePicker
          operatorCost={operatorCost}
          fetEnabled={fetEnabled}
          lineItems={[]}
          basePrice={basePrice}
          onPick={(price) => setField?.("basePrice", String(price))}
        />
      )}

      <div className="flex flex-col gap-2 rounded-sm bg-secondary p-3">
        <div className="flex items-center justify-between">
          <p className="font-montserrat text-[13px] text-muted-foreground">FET</p>
          <p className="font-montserrat font-bold text-[14px] text-foreground">{current ? formatMoney(current.fetAmount) : "—"}</p>
        </div>
        <div className="flex items-center justify-between">
          <p className="font-montserrat text-[13px] text-muted-foreground">Total to client</p>
          <p className="font-montserrat font-bold text-[14px] text-foreground">{current ? formatMoney(current.totalPrice) : "—"}</p>
        </div>
        {seesFinancials && (
          <div className="flex items-center justify-between">
            <p className="font-montserrat text-[13px] text-muted-foreground">Gross profit</p>
            <p className="font-montserrat font-bold text-[14px] text-success">
              {current?.grossProfit === null || current?.grossProfit === undefined ? "—" : formatMoney(current.grossProfit)}
            </p>
          </div>
        )}
      </div>
    </DetailCard>
  );
}
