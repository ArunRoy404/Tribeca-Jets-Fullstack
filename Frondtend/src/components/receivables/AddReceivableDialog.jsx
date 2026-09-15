"use client";

import { useState, useEffect } from "react";
import { X, Edit, Plus } from "lucide-react";
import { useReceivablesStore } from "@/store/useReceivablesStore";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import FormField from "@/components/trips/FormField";
import PickerSelect from "@/components/trips/PickerSelect";
import DatePicker from "@/components/common/DatePicker";

const FIELD_CLASS = "h-13 px-4 rounded-sm text-base font-medium";
const LABEL_CLASS = "text-[16px] text-foreground mb-2";

const clientOptions = ["Sophia Morgan", "Daniel Brooks"];
const brokerOptions = ["Barry", "Mark"];
const statusOptions = ["Due", "Draft", "Sent", "Partially Paid", "Paid", "Overdue", "Cancelled"];

export default function AddReceivableDialog() {
  const open = useReceivablesStore((s) => s.addModalOpen);
  const close = useReceivablesStore((s) => s.closeAddModal);
  const editingReceivable = useReceivablesStore((s) => s.editingReceivable);
  const addReceivable = useReceivablesStore((s) => s.addReceivable);
  const updateReceivable = useReceivablesStore((s) => s.updateReceivable);

  const [formData, setFormData] = useState({
    client: "",
    tripId: "",
    invoice: "",
    due: "",
    amountRaw: "",
    fetRaw: "",
    broker: "Barry",
    status: "Due",
  });

  useEffect(() => {
    if (open && editingReceivable) {
      setFormData({
        client: editingReceivable.client || "",
        tripId: editingReceivable.tripId || "",
        invoice: editingReceivable.invoice || "",
        due: editingReceivable.due || "",
        amountRaw: editingReceivable.amountRaw !== undefined ? editingReceivable.amountRaw : "",
        fetRaw: editingReceivable.fetRaw !== undefined ? editingReceivable.fetRaw : "",
        broker: editingReceivable.broker || "Barry",
        status: editingReceivable.status || "Due",
      });
    } else if (open) {
      setFormData({
        client: "",
        tripId: "TJ- 1048",
        invoice: "INV-2026-603",
        due: "Choose Date",
        amountRaw: "",
        fetRaw: "",
        broker: "Barry",
        status: "Due",
      });
    }
  }, [open, editingReceivable]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (editingReceivable) {
      updateReceivable(editingReceivable.id, formData);
    } else {
      addReceivable(formData);
    }
  };

  const invoiceTotal = (Number(formData.amountRaw) || 0) + (Number(formData.fetRaw) || 0);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-5xl rounded-2xl p-6 gap-4 max-h-[90vh] overflow-y-auto">
        <div className="border-b border-secondary flex items-start justify-between gap-4 pb-4 w-full">
          <div className="flex flex-col gap-2">
            <DialogTitle className="font-montserrat font-bold text-[20px] text-black-text leading-none">
              {editingReceivable ? "Edit Receivable" : "Add Receivable"}
            </DialogTitle>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
          <div className="flex flex-col sm:flex-row gap-4 items-start w-full">
            <FormField label="Client" labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
              <PickerSelect
                value={formData.client}
                onChange={(val) => handleChange("client", val)}
                options={clientOptions}
                placeholder="Select Client"
                className={FIELD_CLASS}
              />
            </FormField>
            <FormField label="Trip ID" labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
              <Input
                className={FIELD_CLASS}
                placeholder="TJ- 1048"
                value={formData.tripId}
                onChange={(e) => handleChange("tripId", e.target.value)}
              />
            </FormField>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-start w-full">
            <FormField label="Invoice #" labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
              <Input
                className={FIELD_CLASS}
                placeholder="INV-2026-603"
                value={formData.invoice}
                onChange={(e) => handleChange("invoice", e.target.value)}
              />
            </FormField>
            <FormField label="Due date" labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
              <DatePicker
                className={FIELD_CLASS}
                value={formData.due === "Choose Date" ? "" : formData.due}
                onChange={(val) => handleChange("due", val || "Choose Date")}
                placeholder="Choose Date"
              />
            </FormField>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-start w-full">
            <FormField label="Amount ($)" labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
              <Input
                className={FIELD_CLASS}
                type="number"
                placeholder="$"
                value={formData.amountRaw}
                onChange={(e) => handleChange("amountRaw", e.target.value)}
              />
            </FormField>
            <FormField label="FET ($)" labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
              <Input
                className={FIELD_CLASS}
                type="number"
                placeholder="7.5% of base"
                value={formData.fetRaw}
                onChange={(e) => handleChange("fetRaw", e.target.value)}
              />
            </FormField>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-start w-full">
            <FormField label="Broker" labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
              <PickerSelect
                value={formData.broker}
                onChange={(val) => handleChange("broker", val)}
                options={brokerOptions}
                placeholder="Select Broker"
                className={FIELD_CLASS}
              />
            </FormField>
            <FormField label="Status" labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
              <PickerSelect
                value={formData.status}
                onChange={(val) => handleChange("status", val)}
                options={statusOptions}
                placeholder="Select Status"
                className={FIELD_CLASS}
              />
            </FormField>
          </div>

          {/* Invoice total summary card */}
          <div className="bg-[#f3f4f8] rounded-sm p-4 flex items-center justify-between border border-border/60 mt-1">
            <span className="font-montserrat text-base text-muted-foreground">
              Invoice total ( base + FET )
            </span>
            <span className="font-montserrat font-bold text-lg text-foreground">
              ${invoiceTotal.toLocaleString()}
            </span>
          </div>

          {/* Actions Footer */}
          <div className="border-t border-secondary flex gap-2 items-center pt-4 w-full">
            <Button type="button" variant="outline" className="gap-2 px-4" onClick={close}>
              <X className="size-4" />
              Cancel
            </Button>
            <Button type="submit" className="gap-2 px-4">
              {editingReceivable ? <Edit className="size-4" /> : <Plus className="size-4" />}
              {editingReceivable ? "Save Changes" : "Add Receivable"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
