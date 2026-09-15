"use client";

import { useState, useEffect } from "react";
import { X, Edit, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useOperatorPaymentsStore } from "@/store/useOperatorPaymentsStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import FormField from "@/components/trips/FormField";
import PickerSelect from "@/components/trips/PickerSelect";
import DatePicker from "@/components/common/DatePicker";

const FIELD_CLASS = "h-13 px-4 rounded-sm text-base font-medium";
const LABEL_CLASS = "text-[16px] text-foreground mb-2";

const operatorOptions = ["FlexJet", "VistaJet", "NetJets", "ExecuJet"];
const methodOptions = ["Wire Transfer", "Credit Card", "Check", "Zelle", "ACH", "Other"];
const brokerOptions = ["Barry", "Mark"];
const statusOptions = ["Pending", "Due", "Partially Paid", "Paid", "Overdue"];

export default function AddOperatorPaymentDialog() {
  const open = useOperatorPaymentsStore((s) => s.addModalOpen);
  const close = useOperatorPaymentsStore((s) => s.closeAddModal);
  const editingPayment = useOperatorPaymentsStore((s) => s.editingPayment);
  const addOperatorPayment = useOperatorPaymentsStore((s) => s.addOperatorPayment);
  const updateOperatorPayment = useOperatorPaymentsStore((s) => s.updateOperatorPayment);

  const [formData, setFormData] = useState({
    operator: "",
    tripId: "",
    due: "",
    amountRaw: "",
    method: "Wire Transfer",
    broker: "Barry",
    status: "Pending",
    notes: "",
  });

  useEffect(() => {
    if (open && editingPayment) {
      setFormData({
        operator: editingPayment.operator || "",
        tripId: editingPayment.tripId || "",
        due: editingPayment.due || "",
        amountRaw: editingPayment.amountRaw !== undefined ? editingPayment.amountRaw : "",
        method: editingPayment.method || "Wire Transfer",
        broker: editingPayment.broker || "Barry",
        status: editingPayment.status || "Pending",
        notes: editingPayment.notes || "",
      });
    } else if (open) {
      setFormData({
        operator: "",
        tripId: "TJ- 1048",
        due: "Choose Date",
        amountRaw: "",
        method: "Wire Transfer",
        broker: "Barry",
        status: "Pending",
        notes: "",
      });
    }
  }, [open, editingPayment]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (editingPayment) {
      updateOperatorPayment(editingPayment.id, formData);
    } else {
      addOperatorPayment(formData);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-5xl rounded-2xl p-6 gap-4 max-h-[90vh] overflow-y-auto">
        <div className="border-b border-secondary flex items-start justify-between gap-4 pb-4 w-full">
          <DialogTitle className="font-montserrat font-bold text-[20px] text-black-text leading-none">
            {editingPayment ? "Edit Operator Payment" : "Add Operator Payment"}
          </DialogTitle>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
          <div className="flex flex-col sm:flex-row gap-4 items-start w-full">
            <FormField label="Operator" labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
              <PickerSelect
                value={formData.operator}
                onChange={(val) => handleChange("operator", val)}
                options={operatorOptions}
                placeholder="Select operator"
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
            <FormField label="Amount ($)" labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
              <Input
                className={FIELD_CLASS}
                type="number"
                placeholder="$"
                value={formData.amountRaw}
                onChange={(e) => handleChange("amountRaw", e.target.value)}
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
            <FormField label="Method" labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
              <PickerSelect
                value={formData.method}
                onChange={(val) => handleChange("method", val)}
                options={methodOptions}
                placeholder="Select Method"
                className={FIELD_CLASS}
              />
            </FormField>
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

          <FormField label="Notes" labelClassName={LABEL_CLASS}>
            <Textarea
              className="rounded-sm text-base font-medium min-h-24"
              placeholder="Type..."
              value={formData.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
            />
          </FormField>

          <div className="border-t border-secondary flex gap-2 items-center pt-4 w-full">
            <Button type="button" variant="outline" className="gap-2 px-4" onClick={close}>
              <X className="size-4" />
              Cancel
            </Button>
            <Button type="submit" className="gap-2 px-4">
              {editingPayment ? <Edit className="size-4" /> : <Plus className="size-4" />}
              {editingPayment ? "Save Changes" : "Add Operator Payment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
