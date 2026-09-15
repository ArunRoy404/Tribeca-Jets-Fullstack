"use client";

import { useState, useEffect } from "react";
import { X, Pencil, Plus } from "lucide-react";
import { useCommissionsStore } from "@/store/useCommissionsStore";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import FormField from "@/components/trips/FormField";
import PickerSelect from "@/components/trips/PickerSelect";
import DatePicker from "@/components/common/DatePicker";
import { cn } from "@/lib/utils";

const FIELD_CLASS = "h-13 px-4 rounded-sm text-base font-medium";
const LABEL_CLASS = "text-[16px] text-foreground mb-2";

const clientOptions = [
  "Sophia Morgan",
  "Daniel Brooks",
  "Hope Sterling",
  "James Holloway",
  "Sarah Chen",
];
const methodOptions = ["Wire Transfer", "Credit Card", "Check", "Zelle", "ACH", "Other"];
const brokerOptions = ["Barry", "Mark"];
const statusOptions = ["Paid", "Pending", "Due", "Partially Paid", "Overdue", "Cancelled"];

const EMPTY_FORM = {
  recipientType: "crm", // 'crm' | 'manual'
  client: "",
  recipientName: "",
  company: "",
  tripId: "TJ-1048",
  amountRaw: "",
  method: "Wire Transfer",
  broker: "Barry",
  dated: "Choose Date",
  status: "Paid",
  notes: "",
};

export default function AddCommissionDialog() {
  const open = useCommissionsStore((s) => s.addModalOpen);
  const close = useCommissionsStore((s) => s.closeAddModal);
  const editingCommission = useCommissionsStore((s) => s.editingCommission);
  const addCommission = useCommissionsStore((s) => s.addCommission);
  const updateCommission = useCommissionsStore((s) => s.updateCommission);

  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (open && editingCommission) {
      setForm({
        recipientType: editingCommission.type === "Manual" ? "manual" : "crm",
        client: editingCommission.recipient || "",
        recipientName: editingCommission.recipient || "",
        company: editingCommission.company || "",
        tripId: editingCommission.tripId || "TJ-1048",
        amountRaw: editingCommission.amountRaw !== undefined ? editingCommission.amountRaw : "",
        method: editingCommission.method || "Wire Transfer",
        broker: editingCommission.broker || "Barry",
        dated: editingCommission.dated || "Choose Date",
        status: editingCommission.status || "Paid",
        notes: editingCommission.notes || "",
      });
    } else if (open) {
      setForm(EMPTY_FORM);
    }
  }, [open, editingCommission]);

  const setField = (field) => (value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (e) => {
    e?.preventDefault();
    const recipient =
      form.recipientType === "crm" ? form.client || "Sophia Morgan" : form.recipientName || "Manual Recipient";

    const payload = {
      ...form,
      recipient,
      amountRaw: Number(form.amountRaw) || 0,
      dated: form.dated === "Choose Date" ? "-" : form.dated,
    };

    if (editingCommission) {
      updateCommission(editingCommission.id, payload);
    } else {
      addCommission(payload);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-5xl rounded-2xl p-6 gap-4 max-h-[90vh] overflow-y-auto">
        <div className="border-b border-secondary flex items-start justify-between gap-4 pb-4 w-full">
          <DialogTitle className="font-montserrat font-bold text-[20px] text-black-text leading-none">
            {editingCommission ? "Edit Commission" : "Add Commission"}
          </DialogTitle>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
          {/* Recipient Type Toggle Tabs */}
          <FormField label="Recipient type" labelClassName={LABEL_CLASS}>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, recipientType: "crm" }))}
                className={cn(
                  "h-10 px-4 rounded-md font-montserrat text-sm font-medium transition-colors cursor-pointer",
                  form.recipientType === "crm"
                    ? "bg-[#a855f7] text-white shadow-sm"
                    : "bg-[#f3f4f8] text-foreground hover:bg-[#e4e5eb]"
                )}
              >
                Registered CRM Client
              </button>
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, recipientType: "manual" }))}
                className={cn(
                  "h-10 px-4 rounded-md font-montserrat text-sm font-medium transition-colors cursor-pointer",
                  form.recipientType === "manual"
                    ? "bg-[#a855f7] text-white shadow-sm"
                    : "bg-[#f3f4f8] text-foreground hover:bg-[#e4e5eb]"
                )}
              >
                Manual Recipient
              </button>
            </div>
          </FormField>

          {/* Conditional Recipient Inputs */}
          {form.recipientType === "crm" ? (
            <FormField label="Client" labelClassName={LABEL_CLASS}>
              <PickerSelect
                value={form.client}
                onChange={setField("client")}
                options={clientOptions}
                placeholder="Select Client"
                className={FIELD_CLASS}
              />
            </FormField>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 items-start w-full">
              <FormField label="Recipient Name" labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
                <Input
                  className={FIELD_CLASS}
                  placeholder="Type..."
                  value={form.recipientName}
                  onChange={(e) => setField("recipientName")(e.target.value)}
                />
              </FormField>
              <FormField label="Company" labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
                <Input
                  className={FIELD_CLASS}
                  placeholder="Type...."
                  value={form.company}
                  onChange={(e) => setField("company")(e.target.value)}
                />
              </FormField>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 items-start w-full">
            <FormField label="Trip / Reference" labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
              <Input
                className={FIELD_CLASS}
                placeholder="TJ-1048"
                value={form.tripId}
                onChange={(e) => setField("tripId")(e.target.value)}
              />
            </FormField>
            <FormField label="Amount ($)" labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
              <Input
                className={FIELD_CLASS}
                type="number"
                placeholder="$"
                value={form.amountRaw}
                onChange={(e) => setField("amountRaw")(e.target.value)}
              />
            </FormField>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-start w-full">
            <FormField label="Method" labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
              <PickerSelect
                value={form.method}
                onChange={setField("method")}
                options={methodOptions}
                placeholder="Select Method"
                className={FIELD_CLASS}
              />
            </FormField>
            <FormField label="Broker" labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
              <PickerSelect
                value={form.broker}
                onChange={setField("broker")}
                options={brokerOptions}
                placeholder="Select Broker"
                className={FIELD_CLASS}
              />
            </FormField>
            <FormField label="Paid date" labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
              <DatePicker
                className={FIELD_CLASS}
                value={form.dated === "Choose Date" ? "" : form.dated}
                onChange={(val) => setField("dated")(val || "Choose Date")}
                placeholder="Choose Date"
              />
            </FormField>
          </div>

          <FormField label="Status" labelClassName={LABEL_CLASS}>
            <PickerSelect
              value={form.status}
              onChange={setField("status")}
              options={statusOptions}
              placeholder="Select Status"
              className={FIELD_CLASS}
            />
          </FormField>

          <FormField label="Notes" labelClassName={LABEL_CLASS}>
            <Textarea
              className="rounded-sm text-base font-medium min-h-24"
              placeholder="Type..."
              value={form.notes}
              onChange={(e) => setField("notes")(e.target.value)}
            />
          </FormField>

          <div className="border-t border-secondary flex gap-2 items-center pt-4 w-full">
            <Button type="button" variant="outline" className="gap-2 px-4" onClick={close}>
              <X className="size-4" />
              Cancel
            </Button>
            <Button type="submit" className="gap-2 px-4">
              {editingCommission ? <Pencil className="size-4" /> : <Plus className="size-4" />}
              {editingCommission ? "Save Changes" : "Add Commission"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
