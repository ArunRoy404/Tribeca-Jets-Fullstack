"use client";

import { useState, useEffect } from "react";
import { X, Check } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useReceivablesStore } from "@/store/useReceivablesStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import FormField from "@/components/trips/FormField";
import PickerSelect from "@/components/trips/PickerSelect";
import DatePicker from "@/components/common/DatePicker";

const FIELD_CLASS = "h-13 px-4 rounded-sm text-base font-medium";
const LABEL_CLASS = "text-[16px] text-foreground mb-2";

const methodOptions = ["Wire Transfer", "Credit Card", "Check", "Zelle", "ACH", "Other"];

export default function RecordPaymentDialog() {
  const open = useReceivablesStore((s) => s.recordPaymentModalOpen);
  const close = useReceivablesStore((s) => s.closeRecordPaymentModal);
  const targetId = useReceivablesStore((s) => s.recordPaymentTargetId);
  const getReceivableById = useReceivablesStore((s) => s.getReceivableById);
  const recordPayment = useReceivablesStore((s) => s.recordPayment);

  const item = targetId ? getReceivableById(targetId) : null;

  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [method, setMethod] = useState("Wire Transfer");

  useEffect(() => {
    if (open && item) {
      setPaymentAmount(item.balanceRaw || "");
      setPaymentDate("Aug 22, 2026");
      setMethod(item.method || "Wire Transfer");
    }
  }, [open, item]);

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (item) {
      recordPayment(item.id, {
        amountRaw: Number(paymentAmount) || 0,
        date: paymentDate,
        method,
      });
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-4xl rounded-2xl p-6 gap-4 max-h-[90vh] overflow-y-auto">
        <div className="border-b border-secondary flex items-start justify-between gap-4 pb-4 w-full">
          <DialogTitle className="font-montserrat font-bold text-[20px] text-black-text leading-none">
            Record Payment
          </DialogTitle>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
          {/* Top Summary Block */}
          <div className="bg-[#f3f4f8] rounded-sm p-5 flex flex-col gap-3.5 border border-border/60">
            <div className="flex items-center justify-between">
              <span className="font-montserrat text-base text-muted-foreground">Invoice / Ref</span>
              <span className="font-montserrat font-bold text-base text-purple">{item.invoice}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-montserrat text-base text-muted-foreground">Client / Operator</span>
              <span className="font-montserrat font-bold text-base text-foreground">{item.client}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-montserrat text-base text-muted-foreground">Total amount</span>
              <span className="font-montserrat font-bold text-base text-foreground">{item.amount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-montserrat text-base text-muted-foreground">Current balance</span>
              <span className="font-montserrat font-bold text-base text-destructive">{item.balance}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-start w-full">
            <FormField label="Payment amount" labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
              <Input
                className={FIELD_CLASS}
                type="number"
                placeholder="Enter amount"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
            </FormField>
            <FormField label="Date" labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
              <DatePicker
                className={FIELD_CLASS}
                value={paymentDate}
                onChange={setPaymentDate}
                placeholder="Choose Date"
              />
            </FormField>
          </div>

          <FormField label="Method" labelClassName={LABEL_CLASS}>
            <PickerSelect
              value={method}
              onChange={setMethod}
              options={methodOptions}
              placeholder="Select Method"
              className={FIELD_CLASS}
            />
          </FormField>

          <div className="bg-[#f3f4f8] rounded-sm p-4 flex items-center justify-between border border-border/60 mt-1">
            <span className="font-montserrat text-base text-muted-foreground">
              Invoice total ( base + FET )
            </span>
            <span className="font-montserrat font-bold text-lg text-foreground">
              ${(Number(paymentAmount) || 0).toLocaleString()}
            </span>
          </div>

          <div className="border-t border-secondary flex gap-2 items-center pt-4 w-full">
            <Button type="button" variant="outline" className="gap-2 px-4" onClick={close}>
              <X className="size-4" />
              Cancel
            </Button>
            <Button type="submit" className="gap-2 px-4 bg-[#00b07d] hover:bg-[#009b6e] text-white">
              <Check className="size-4" />
              Record Payment
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
