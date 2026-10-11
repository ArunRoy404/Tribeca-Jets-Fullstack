"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { useRecordQuoteResponse } from "@/hooks/operator-quotes";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import FormField from "@/components/trips/FormField";
import AircraftPicker from "@/components/aircraft/AircraftPicker";
import SectionCard from "@/components/common/SectionCard";
import DetailField from "@/components/common/DetailField";

const FIELD_CLASS = "h-11 px-3 rounded-md text-sm font-medium";
const LABEL_CLASS = "text-[14px] font-semibold text-foreground mb-1.5";

const EMPTY_FORM = {
  price: "",
  aircraftId: "",
  quotedAircraft: "",
  quotedTailNumber: "",
  terms: "",
  internalNotes: "",
};

function getInitialForm(quote) {
  if (!quote) return EMPTY_FORM;
  return {
    price: quote.rawPrice ? String(quote.rawPrice) : "",
    aircraftId: quote.aircraftId ?? "",
    quotedAircraft: quote.aircraft !== "—" ? quote.aircraft : "",
    quotedTailNumber: "",
    terms: quote.terms !== "—" ? quote.terms : "",
    internalNotes: quote.internalNotes ?? "",
  };
}

export default function RecordResponseDialog({ quote, open, onClose }) {
  const [form, setForm] = useState(() => getInitialForm(quote));
  const [priceError, setPriceError] = useState("");
  const { mutate: recordResponse, isPending } = useRecordQuoteResponse();

  const setField = (field) => (value) => {
    if (field === "price" && priceError) setPriceError("");
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!quote?.id) return;

    const trimmedPrice = String(form.price ?? "").trim();
    if (!trimmedPrice) {
      setPriceError("Please enter the operator's quoted price");
      return;
    }

    const priceNum = Number(trimmedPrice);
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      setPriceError("Please enter a valid price amount");
      return;
    }

    recordResponse(
      {
        id: quote.id,
        price: priceNum,
        aircraftId: form.aircraftId.trim() || null,
        quotedAircraft: form.quotedAircraft.trim() || undefined,
        quotedTailNumber: form.quotedTailNumber.trim() || undefined,
        terms: form.terms.trim() || undefined,
        internalNotes: form.internalNotes.trim() || undefined,
      },
      {
        onSuccess: () => {
          onClose?.();
        },
      },
    );
  };

  if (!quote) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose?.()}>
      <DialogContent className="sm:max-w-2xl rounded-2xl p-6 gap-4 max-h-[90vh] overflow-y-auto">
        <div className="border-b border-secondary flex items-start justify-between gap-4 pb-4 w-full">
          <div className="flex flex-col gap-1.5">
            <DialogTitle className="font-montserrat font-bold text-[20px] text-foreground leading-none">
              Record Operator Response
            </DialogTitle>
            <p className="font-montserrat font-medium text-[14px] text-muted-foreground">
              {quote.operator} · {quote.requestReference}
            </p>
          </div>
        </div>

        <SectionCard>
          <div className="flex gap-4 w-full">
            <DetailField label="OPERATOR" value={quote.operator} labelClassName="text-[13px]" />
            <DetailField label="STATUS" value={quote.status} labelClassName="text-[13px]" />
          </div>
        </SectionCard>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start w-full">
            <FormField
              label="Quoted Price ($) *"
              labelClassName={LABEL_CLASS}
              className="flex-1 min-w-0"
              error={priceError}
            >
              <Input
                className={FIELD_CLASS}
                type="number"
                min="0"
                step="1"
                placeholder="e.g. 28500"
                value={form.price}
                onChange={(e) => setField("price")(e.target.value)}
              />
            </FormField>

            <FormField label="Fleet Aircraft" optional labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
              <AircraftPicker
                value={form.aircraftId}
                onChange={(val) => setField("aircraftId")(val || "")}
                params={quote.operatorId ? { operatorId: quote.operatorId } : undefined}
                placeholder="Select tail from fleet"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start w-full">
            <FormField label="Quoted Model / Type" optional labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
              <Input
                className={FIELD_CLASS}
                placeholder="e.g. Citation X"
                value={form.quotedAircraft}
                onChange={(e) => setField("quotedAircraft")(e.target.value)}
              />
            </FormField>

            <FormField label="Quoted Tail Number" optional labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
              <Input
                className={FIELD_CLASS}
                placeholder="e.g. N123AB"
                value={form.quotedTailNumber}
                onChange={(e) => setField("quotedTailNumber")(e.target.value)}
              />
            </FormField>
          </div>

          <FormField label="Terms & Cancellation Policy" optional labelClassName={LABEL_CLASS}>
            <Textarea
              className="rounded-md text-sm font-medium min-h-20"
              placeholder="Cancellation fees, repositioning stipulations, de-icing terms…"
              value={form.terms}
              onChange={(e) => setField("terms")(e.target.value)}
            />
          </FormField>

          <FormField label="Internal Notes" optional labelClassName={LABEL_CLASS}>
            <Textarea
              className="rounded-md text-sm font-medium min-h-20"
              placeholder="Notes visible to brokers only…"
              value={form.internalNotes}
              onChange={(e) => setField("internalNotes")(e.target.value)}
            />
          </FormField>

          <div className="border-t border-secondary flex gap-2 items-center justify-end pt-4 w-full">
            <Button
              type="button"
              variant="outline"
              className="gap-2 px-4 cursor-pointer"
              onClick={onClose}
            >
              <X className="size-4" />
              Cancel
            </Button>
            <Button
              type="submit"
              className="gap-2 px-4 cursor-pointer"
              disabled={isPending}
            >
              <Check className="size-4" />
              Save Response
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
