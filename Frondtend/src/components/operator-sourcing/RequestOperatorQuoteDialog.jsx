"use client";

import { useState } from "react";
import { Send, X } from "lucide-react";
import { useOperatorSourcingStore } from "@/store/useOperatorSourcingStore";
import { sourcingOperatorOptions } from "@/dummyData/operatorSourcing";
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

const EMPTY_FORM = { operator: "", suggestedAircraft: "", notes: "" };

export default function RequestOperatorQuoteDialog() {
  const quoteRequestId = useOperatorSourcingStore((s) => s.quoteRequestId);
  const closeQuoteRequest = useOperatorSourcingStore((s) => s.closeQuoteRequest);
  const getRequestById = useOperatorSourcingStore((s) => s.getRequestById);
  const addQuote = useOperatorSourcingStore((s) => s.addQuote);
  const [form, setForm] = useState(EMPTY_FORM);

  const request = quoteRequestId ? getRequestById(quoteRequestId) : null;
  const setField = (field) => (value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleClose = () => {
    setForm(EMPTY_FORM);
    closeQuoteRequest();
  };

  const handleSend = () => {
    if (!request || !form.operator) return;
    addQuote(request.id, {
      operator: form.operator,
      aircraft: form.suggestedAircraft || "TBD",
      tailNumber: "TBD",
      price: "Awaiting quote",
      amenities: form.notes || "—",
      responseTime: "—",
      status: "Pending",
    });
    handleClose();
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
                  {request.id} · {request.from} → {request.to}
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
                value={form.operator}
                onChange={setField("operator")}
                options={sourcingOperatorOptions}
                placeholder="Select a Operator"
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
                value={form.notes}
                onChange={(e) => setField("notes")(e.target.value)}
              />
            </FormField>

            <div className="border-t border-secondary flex gap-2 items-center pt-4 w-full">
              <Button variant="outline" className="gap-2 px-4" onClick={handleClose}>
                <X className="size-4" />
                Cancel
              </Button>
              <Button className="gap-2 px-4" onClick={handleSend}>
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
