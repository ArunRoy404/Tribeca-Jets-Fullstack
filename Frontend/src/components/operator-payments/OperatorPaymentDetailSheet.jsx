"use client";

import { Edit, Trash2, CheckCircle2 } from "lucide-react";
import { useOperatorPaymentsStore } from "@/store/useOperatorPaymentsStore";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/common/StatusBadge";
import DetailField from "@/components/common/DetailField";
import SectionCard from "@/components/common/SectionCard";

export default function OperatorPaymentDetailSheet() {
  const selectedPaymentId = useOperatorPaymentsStore((s) => s.selectedPaymentId);
  const close = useOperatorPaymentsStore((s) => s.closePaymentDetail);
  const getPaymentById = useOperatorPaymentsStore((s) => s.getPaymentById);
  const openEditModal = useOperatorPaymentsStore((s) => s.openEditModal);
  const openDeleteModal = useOperatorPaymentsStore((s) => s.openDeleteModal);
  const openRecordPaymentModal = useOperatorPaymentsStore((s) => s.openRecordPaymentModal);

  const item = selectedPaymentId ? getPaymentById(selectedPaymentId) : null;

  return (
    <Sheet open={!!item} onOpenChange={(open) => !open && close()}>
      <SheetContent className="data-[side=right]:w-full sm:data-[side=right]:max-w-175 gap-4 p-6 overflow-y-auto">
        {item && (
          <>
            <div className="border-b border-secondary flex items-start justify-between pb-4 w-full">
              <div className="flex flex-col gap-2 items-start">
                <div className="flex gap-2 items-center">
                  <p className="font-montserrat font-bold text-[20px] text-black-text">{item.operator}</p>
                  <StatusBadge status={item.status} bordered />
                </div>
                <p className="font-montserrat font-normal text-[12px] text-muted-foreground">{item.id} · {item.tripId}</p>
              </div>
            </div>

            <SectionCard>
              <div className="flex gap-4 w-full">
                <DetailField label="OPERATOR" value={item.operator} labelClassName="text-[14px]" />
                <DetailField label="TRIP ID" value={item.tripId} labelClassName="text-[14px]" />
              </div>
              <div className="flex gap-4 w-full">
                <DetailField label="AMOUNT" value={item.amount} valueClassName="text-foreground" labelClassName="text-[14px]" />
                <DetailField label="PAID" value={item.paid} valueClassName="text-success" labelClassName="text-[14px]" />
              </div>
              <div className="flex gap-4 w-full">
                <DetailField label="BALANCE" value={item.balance} valueClassName="text-purple" labelClassName="text-[14px]" />
                <DetailField label="DUE DATE" value={item.due} labelClassName="text-[14px]" />
              </div>
              <div className="flex gap-4 w-full">
                <DetailField label="METHOD" value={item.method} labelClassName="text-[14px]" />
                <DetailField label="BROKER" value={item.broker} labelClassName="text-[14px]" />
              </div>
            </SectionCard>

            <SectionCard title="Notes" titleClassName="text-foreground">
              <p className="font-montserrat font-normal text-[14px] text-muted-foreground w-full">
                {item.notes || "No notes provided."}
              </p>
            </SectionCard>

            <div className="border-t border-secondary flex items-center justify-between gap-3 pt-4 w-full mt-auto">
              <Button
                type="button"
                className="bg-[#00b07d] hover:bg-[#009b6e] text-white font-montserrat font-semibold gap-2 px-4"
                onClick={() => {
                  close();
                  openRecordPaymentModal(item.id);
                }}
              >
                <CheckCircle2 className="size-4" />
                Record Payment
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2 px-4"
                  onClick={() => {
                    close();
                    openEditModal(item);
                  }}
                >
                  <Edit className="size-4" />
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="gap-2 px-4"
                  onClick={() => {
                    close();
                    openDeleteModal(item.id);
                  }}
                >
                  <Trash2 className="size-4" />
                  Delete
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
