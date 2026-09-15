"use client";

import { Edit, Trash2, CheckCircle2 } from "lucide-react";
import { useReceivablesStore } from "@/store/useReceivablesStore";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/common/StatusBadge";
import DetailField from "@/components/common/DetailField";
import SectionCard from "@/components/common/SectionCard";

export default function ReceivableDetailSheet() {
  const selectedReceivableId = useReceivablesStore((s) => s.selectedReceivableId);
  const close = useReceivablesStore((s) => s.closeReceivableDetail);
  const getReceivableById = useReceivablesStore((s) => s.getReceivableById);
  const openEditModal = useReceivablesStore((s) => s.openEditModal);
  const openDeleteModal = useReceivablesStore((s) => s.openDeleteModal);
  const openRecordPaymentModal = useReceivablesStore((s) => s.openRecordPaymentModal);

  const item = selectedReceivableId ? getReceivableById(selectedReceivableId) : null;

  return (
    <Sheet open={!!item} onOpenChange={(open) => !open && close()}>
      <SheetContent className="data-[side=right]:w-full sm:data-[side=right]:max-w-175 gap-4 p-6 overflow-y-auto">
        {item && (
          <>
            <div className="border-b border-secondary flex items-start justify-between pb-4 w-full">
              <div className="flex flex-col gap-2 items-start">
                <div className="flex gap-2 items-center">
                  <p className="font-montserrat font-bold text-[20px] text-black-text">{item.client}</p>
                  <StatusBadge status={item.status} bordered />
                </div>
                <p className="font-montserrat font-normal text-[12px] text-muted-foreground">{item.invoice} · {item.tripId}</p>
              </div>
            </div>

            <SectionCard>
              <div className="flex gap-4 w-full">
                <DetailField label="CLIENT" value={item.client} labelClassName="text-[14px]" />
                <DetailField label="TRIP ID" value={item.tripId} labelClassName="text-[14px]" />
              </div>
              <div className="flex gap-4 w-full">
                <DetailField label="AMOUNT" value={item.amount} valueClassName="text-foreground" labelClassName="text-[14px]" />
                <DetailField label="FET (7.5%)" value={item.fet} labelClassName="text-[14px]" />
              </div>
              <div className="flex gap-4 w-full">
                <DetailField label="PAID" value={item.paid} valueClassName="text-success" labelClassName="text-[14px]" />
                <DetailField label="BALANCE" value={item.balance} valueClassName="text-purple" labelClassName="text-[14px]" />
              </div>
              <div className="flex gap-4 w-full">
                <DetailField label="DUE DATE" value={item.due} labelClassName="text-[14px]" />
                <DetailField label="METHOD" value={item.method || "Wire Transfer"} labelClassName="text-[14px]" />
              </div>
              <div className="flex gap-4 w-full">
                <DetailField label="BROKER" value={item.broker} labelClassName="text-[14px]" />
                <DetailField label="STATUS" value={item.status} labelClassName="text-[14px]" />
              </div>
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
