"use client";

import Link from "next/link";
import { BadgeCheck, Banknote, Pencil, RotateCcw, Trash2 } from "lucide-react";
import DetailSheet from "@/components/common/DetailSheet";
import DetailField from "@/components/common/DetailField";
import SectionCard from "@/components/common/SectionCard";
import StatusBadge from "@/components/common/StatusBadge";
import TableStatus from "@/components/table/common/TableStatus";
import { Button } from "@/components/ui/button";
import {
  useCommission,
  useCommissionsTableParams,
  useRemoveCommission,
  useRestoreCommission,
  useUpdateCommission,
} from "@/hooks/commissions";
import { usePermissions } from "@/hooks/common/usePermissions";
import { Permission } from "@/lib/permissions";
import { toCommissionRow } from "@/lib/commission";
import { useCommissionsStore } from "@/store/useCommissionsStore";

/** One commission, opened from the URL (`?commission=<id>`). */
export default function CommissionDetailSheet() {
  const params = useCommissionsTableParams();
  const id = params.commission || null;
  const { data, isPending, error, refetch } = useCommission(id);
  const item = data ? toCommissionRow(data) : null;

  const { canWrite } = usePermissions();
  const mayWrite = canWrite(Permission.MANAGE_COMMISSIONS);
  const openEditModal = useCommissionsStore((s) => s.openEditModal);

  const { mutate: update, isPending: moving } = useUpdateCommission();
  const { mutate: remove } = useRemoveCommission();
  const { mutate: restore } = useRestoreCommission();

  const close = () => params.setCommission("");

  return (
    <DetailSheet open={Boolean(id)} onOpenChange={(open) => !open && close()} resetKey={id}>
      {!item ? (
        <TableStatus isLoading={isPending} error={error} onRetry={refetch} />
      ) : (
        <>
          <div className="border-b border-secondary flex items-start justify-between pb-4 w-full">
            <div className="flex flex-col gap-2 items-start">
              <div className="flex flex-wrap gap-2 items-center">
                <p className="font-montserrat font-bold text-[20px] text-foreground">{item.recipient}</p>
                <StatusBadge status={item.status} bordered />
                {item.isArchived && <StatusBadge status="Archived" />}
              </div>
              <p className="font-montserrat text-[12px] text-muted-foreground">
                {item.reference} · {item.type}
              </p>
            </div>
          </div>

          <SectionCard>
            <div className="flex gap-4 w-full">
              <DetailField
                label="TRIP"
                value={
                  item.tripId ? (
                    <Link href={`/dashboard/trips/${item.tripId}`} className="text-purple hover:underline">
                      {item.tripReference}
                    </Link>
                  ) : (
                    item.tripReference
                  )
                }
                labelClassName="text-[14px]"
              />
              <DetailField label="TRIP DATE" value={item.tripDate} labelClassName="text-[14px]" />
            </div>
            <div className="flex gap-4 w-full">
              <DetailField label="CLIENT" value={item.client} labelClassName="text-[14px]" />
              <DetailField label="STRUCTURE" value={item.structure} labelClassName="text-[14px]" />
            </div>
            <div className="flex gap-4 w-full">
              <DetailField label="ESTIMATED" value={item.estimated} labelClassName="text-[14px]" />
              <DetailField label="FINAL" value={item.final} valueClassName="text-success" labelClassName="text-[14px]" />
            </div>
            <div className="flex gap-4 w-full">
              <DetailField label="PAID ON" value={item.paidAt} labelClassName="text-[14px]" />
              <DetailField label="METHOD" value={item.method} valueClassName="text-purple" labelClassName="text-[14px]" />
            </div>
            <div className="flex gap-4 w-full">
              <DetailField label="BROKER" value={item.broker} labelClassName="text-[14px]" />
              <DetailField label="REFERRAL" value={item.referral?.reference ?? "—"} labelClassName="text-[14px]" />
            </div>
          </SectionCard>

          <SectionCard title="Notes" titleClassName="text-foreground">
            <p className="font-montserrat text-[14px] text-muted-foreground w-full whitespace-pre-line">
              {item.notes || "No notes."}
            </p>
          </SectionCard>

          {mayWrite && (
            <div className="border-t border-secondary flex flex-wrap items-center justify-between gap-3 pt-4 w-full mt-auto">
              {item.isArchived ? (
                <Button variant="outline" className="gap-2 px-4" onClick={() => restore(item.id)}>
                  <RotateCcw className="size-4" />
                  Restore
                </Button>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" className="gap-2 px-4" onClick={() => openEditModal(data)}>
                      <Pencil className="size-4" />
                      Edit
                    </Button>
                    {item.rawStatus === "PENDING" && (
                      <Button variant="outline" disabled={moving} className="gap-2 px-4" onClick={() => update({ id: item.id, status: "EARNED" })}>
                        <BadgeCheck className="size-4" />
                        Mark Earned
                      </Button>
                    )}
                    {item.rawStatus !== "PAID" && item.rawStatus !== "CANCELLED" && (
                      <Button variant="outline" disabled={moving} className="gap-2 px-4" onClick={() => update({ id: item.id, status: "PAID" })}>
                        <Banknote className="size-4" />
                        Mark Paid Today
                      </Button>
                    )}
                  </div>
                  <Button variant="destructive" className="gap-2 px-4" onClick={() => remove(item.id, { onSuccess: close })}>
                    <Trash2 className="size-4" />
                    Archive
                  </Button>
                </>
              )}
            </div>
          )}
        </>
      )}
    </DetailSheet>
  );
}
