"use client";

import { useMemo, useState } from "react";
import { Send, X } from "lucide-react";
import { useOperatorSourcingStore } from "@/store/useOperatorSourcingStore";
import { useAskOperator, useOperatorQuotes } from "@/hooks/operator-quotes";
import { useTripRequest } from "@/hooks/trip-requests";
import { useOperators } from "@/hooks/operators";
import { toSourcingRow } from "@/lib/sourcing";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import FormField from "@/components/trips/FormField";
import PickerSelect from "@/components/trips/PickerSelect";
import DetailField from "@/components/common/DetailField";
import SectionCard from "@/components/common/SectionCard";

const FIELD_CLASS = "h-13 px-4 rounded-sm text-base font-medium";
const LABEL_CLASS = "text-[16px] text-foreground mb-2";

const EMPTY_FORM = { operatorId: "", suggestedAircraft: "", internalNotes: "" };

/**
 * Sends one enquiry out to one operator.
 *
 * The quote starts with **no price** — it is a request, not an answer — and
 * the board shows it as Awaiting Response until the operator comes back. It
 * used to write `price: "Awaiting quote"` and `tailNumber: "TBD"` into the
 * record itself, which put strings the desk never received into fields meant
 * for what they quoted.
 *
 * Operators already asked for this enquiry are removed from the picker: the
 * API allows one live ask per operator per request and returns 409, and
 * offering a choice that cannot be made is worse than not offering it.
 */
export default function RequestOperatorQuoteDialog() {
  const quoteRequestId = useOperatorSourcingStore((s) => s.quoteRequestId);
  const closeQuoteRequest = useOperatorSourcingStore((s) => s.closeQuoteRequest);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data } = useTripRequest(quoteRequestId, {
    enabled: Boolean(quoteRequestId),
  });
  const request = data ? toSourcingRow(data) : null;

  const { data: operators } = useOperators(
    { limit: 100 },
    { enabled: Boolean(quoteRequestId) },
  );
  const { data: existing } = useOperatorQuotes(
    { tripRequestId: quoteRequestId, limit: 100 },
    { enabled: Boolean(quoteRequestId) },
  );
  const { mutate: askOperator, isPending } = useAskOperator();

  const operatorOptions = useMemo(() => {
    const asked = new Set((existing?.data ?? []).map((q) => q.operatorId));
    return (operators?.data ?? [])
      .filter((operator) => !asked.has(operator.id))
      .map((operator) => ({ value: operator.id, label: operator.name }));
  }, [operators?.data, existing?.data]);

  const setField = (field) => (value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleClose = () => {
    setForm(EMPTY_FORM);
    closeQuoteRequest();
  };

  const handleSend = () => {
    if (!request || !form.operatorId) return;
    askOperator(
      {
        tripRequestId: request.id,
        operatorId: form.operatorId,
        suggestedAircraft: form.suggestedAircraft.trim() || undefined,
        internalNotes: form.internalNotes.trim() || undefined,
      },
      { onSuccess: handleClose },
    );
  };

  return (
    <Dialog open={!!request} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="sm:max-w-5xl rounded-2xl p-6 gap-4 max-h-[90vh] overflow-y-auto">
        {request && (
          <>
            <div className="border-b border-secondary flex items-start justify-between gap-4 pb-4 w-full">
              <div className="flex flex-col gap-2">
                <DialogTitle className="font-montserrat font-bold text-[20px] text-black-text leading-none">
                  Request Operator Quote
                </DialogTitle>
                <p className="font-montserrat font-medium text-[16px] text-muted-foreground">
                  {request.reference} · {request.route}
                </p>
              </div>
            </div>

            <SectionCard>
              <div className="flex gap-4 w-full">
                <DetailField label="Aircraft needed" value={request.aircraftNeeded} labelClassName="text-[14px]" />
                <DetailField label="Budget" value={request.budget} labelClassName="text-[14px]" />
              </div>
              <div className="flex gap-4 w-full">
                <DetailField label="Departure" value={request.departure} labelClassName="text-[14px]" />
                <DetailField label="Deadline" value={request.deadline} labelClassName="text-[14px]" />
              </div>
            </SectionCard>

            <FormField label="Operator" labelClassName={LABEL_CLASS}>
              <PickerSelect
                value={form.operatorId}
                onChange={setField("operatorId")}
                options={operatorOptions}
                placeholder={
                  operatorOptions.length
                    ? "Select an operator"
                    : "Every operator has already been asked"
                }
                className={FIELD_CLASS}
              />
            </FormField>

            <FormField label="Suggested aircraft" labelClassName={LABEL_CLASS}>
              <Input
                className={FIELD_CLASS}
                placeholder="e.g. Challenger 650"
                value={form.suggestedAircraft}
                onChange={(e) => setField("suggestedAircraft")(e.target.value)}
              />
            </FormField>

            <FormField label="Notes" labelClassName={LABEL_CLASS}>
              <Textarea
                className="rounded-sm text-base font-medium min-h-31"
                placeholder="Internal notes visible to brokers only…"
                value={form.internalNotes}
                onChange={(e) => setField("internalNotes")(e.target.value)}
              />
            </FormField>

            <div className="border-t border-secondary flex gap-2 items-center pt-4 w-full">
              <Button variant="outline" className="gap-2 px-4 cursor-pointer" onClick={handleClose}>
                <X className="size-4" />
                Cancel
              </Button>
              <Button
                className="gap-2 px-4 cursor-pointer"
                disabled={isPending || !form.operatorId}
                onClick={handleSend}
              >
                <Send className="size-4" />
                Send Request
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
