"use client";

import { Edit, Trash2, CheckCircle2 } from "lucide-react";
import { useTransactionsStore } from "@/store/useTransactionsStore";
import DetailSheet from "@/components/common/DetailSheet";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/common/StatusBadge";
import DetailField from "@/components/common/DetailField";
import SectionCard from "@/components/common/SectionCard";

export default function TransactionDetailSheet() {
  const selectedId = useTransactionsStore((s) => s.selectedTransactionId);
  const close = useTransactionsStore((s) => s.closeTransactionDetail);
  const getTransactionById = useTransactionsStore((s) => s.getTransactionById);
  const openDeleteModal = useTransactionsStore((s) => s.openDeleteModal);
  const openRecordPaymentModal = useTransactionsStore((s) => s.openRecordPaymentModal);

  const item = selectedId ? getTransactionById(selectedId) : null;

  return (
    <DetailSheet open={!!item} onOpenChange={(open) => !open && close()} resetKey={selectedId}>
      {item && (
        <>
          <div className="border-b border-secondary flex items-start justify-between pb-4 w-full">
            <div className="flex flex-col gap-2 items-start">
              <div className="flex gap-2 items-center">
                <p className="font-montserrat font-bold text-[20px] text-black-text">{item.client}</p>
                <StatusBadge status={item.status} bordered />
              </div>
              <p className="font-montserrat font-normal text-[12px] text-muted-foreground">
                {item.reference} · {item.tripId}
              </p>
            </div>
          </div>

          <SectionCard>
            <div className="flex gap-4 w-full">
              <DetailField label="CLIENT" value={item.client} labelClassName="text-[14px]" />
              <DetailField label="TRIP" value={item.tripId} labelClassName="text-[14px]" />
            </div>
            <div className="flex gap-4 w-full">
              <DetailField label="AMOUNT" value={`$${(item.amountRaw || 0).toLocaleString()}`} labelClassName="text-[14px]" />
              <DetailField
                label="FET 7.5%"
                value={`$${(item.fetRaw || 0).toLocaleString()}`}
                valueClassName="text-amber-600"
                labelClassName="text-[14px]"
              />
            </div>
            <div className="flex gap-4 w-full">
              <DetailField
                label="PAID"
                value={`$${(item.paidRaw || 0).toLocaleString()}`}
                valueClassName="text-success"
                labelClassName="text-[14px]"
              />
              <DetailField
                label="BALANCE"
                value={item.balance || `$${(item.balanceRaw || 0).toLocaleString()}`}
                valueClassName="text-destructive"
                labelClassName="text-[14px]"
              />
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

          {item.notes && (
            <SectionCard title="Notes" titleClassName="text-foreground">
              <p className="font-montserrat font-normal text-[14px] text-muted-foreground w-full">
                {item.notes}
              </p>
            </SectionCard>
          )}

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
              <Button type="button" variant="outline" className="gap-2 px-4">
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
    </DetailSheet>
  );
}
