"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useCommissionsStore } from "@/store/useCommissionsStore";
import DetailSheet from "@/components/common/DetailSheet";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/common/StatusBadge";
import DetailField from "@/components/common/DetailField";
import SectionCard from "@/components/common/SectionCard";

export default function CommissionDetailSheet() {
  const selectedId = useCommissionsStore((s) => s.selectedCommissionId);
  const close = useCommissionsStore((s) => s.closeCommissionDetail);
  const getCommissionById = useCommissionsStore((s) => s.getCommissionById);
  const openEditModal = useCommissionsStore((s) => s.openEditModal);
  const openDeleteModal = useCommissionsStore((s) => s.openDeleteModal);

  const item = selectedId ? getCommissionById(selectedId) : null;

  return (
    <DetailSheet open={!!item} onOpenChange={(open) => !open && close()} resetKey={selectedId}>
      {item && (
        <>
          <div className="border-b border-secondary flex items-start justify-between pb-4 w-full">
            <div className="flex flex-col gap-2 items-start">
              <div className="flex gap-2 items-center">
                <p className="font-montserrat font-bold text-[20px] text-black-text">{item.recipient}</p>
                <StatusBadge status={item.status} bordered />
              </div>
              <p className="font-montserrat font-normal text-[12px] text-muted-foreground">{item.tripId}</p>
            </div>
          </div>

          <SectionCard>
            <div className="flex gap-4 w-full">
              <DetailField label="RECIPIENT" value={item.recipient} labelClassName="text-[14px]" />
              <DetailField label="COMMISSION" value={item.amount} valueClassName="text-success" labelClassName="text-[14px]" />
            </div>
            <div className="flex gap-4 w-full">
              <DetailField label="DUE / PAID DATE" value={item.dated} labelClassName="text-[14px]" />
              <DetailField label="METHOD" value={item.method} valueClassName="text-purple" labelClassName="text-[14px]" />
            </div>
            <div className="flex gap-4 w-full">
              <DetailField label="BROKER" value={item.broker} labelClassName="text-[14px]" />
              <DetailField label="TYPE" value={item.type} labelClassName="text-[14px]" />
            </div>
          </SectionCard>

          <SectionCard title="Notes" titleClassName="text-foreground">
            <p className="font-montserrat font-normal text-[14px] text-muted-foreground w-full">
              {item.notes || "No notes provided."}
            </p>
          </SectionCard>

          <div className="border-t border-secondary flex items-center justify-between gap-3 pt-4 w-full mt-auto">
            <Button
              variant="outline"
              className="gap-2 px-4"
              onClick={() => {
                close();
                openEditModal(item);
              }}
            >
              <Pencil className="size-4" />
              Edit
            </Button>
            <Button
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
        </>
      )}
    </DetailSheet>
  );
}
