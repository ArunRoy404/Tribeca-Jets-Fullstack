"use client";

import { UserCheck, X, AlertCircle } from "lucide-react";
import { useLeadsAgentsStore } from "@/store/useLeadsAgentsStore";
import { useUpdateClient } from "@/hooks/clients";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

function InfoRow({ label, value }) {
  if (!value || value === "—") return null;
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/40 text-[13px] font-montserrat">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground text-right">{value}</span>
    </div>
  );
}

/**
 * Converts a lead into a client.
 *
 * **This does not create a second record.** A lead *is* a client — one at lead
 * stage — so converting is a status change on the row that already exists:
 * `status` LEAD → ACTIVE and `leadStage` → WON. The previous version copied
 * the lead into a new client profile, which would have left two rows for one
 * person, drifting apart from the first edit and splitting their trip history
 * between them.
 *
 * Everything already on the record — notes, preferences, follow-ups, the
 * enquiries they filed — stays attached, because nothing moved.
 */
export default function ConvertLeadDialog() {
  const open = useLeadsAgentsStore((s) => s.convertLeadModalOpen);
  const lead = useLeadsAgentsStore((s) => s.convertLeadTargetLead);
  const closeModal = useLeadsAgentsStore((s) => s.closeConvertLeadModal);
  const { mutate: updateClient, isPending } = useUpdateClient();

  if (!lead) return null;

  const handleConvert = () =>
    updateClient(
      { id: lead.id, status: "ACTIVE", leadStage: "WON" },
      { onSuccess: closeModal },
    );

  return (
    <Dialog open={open} onOpenChange={(next) => !next && closeModal()}>
      <DialogContent className="sm:max-w-150 p-6 flex flex-col gap-4">
        <DialogHeader className="flex flex-col items-start gap-1 pb-2 border-b border-border">
          <DialogTitle className="font-montserrat font-bold text-[20px] text-foreground">
            Convert Lead to Client?
          </DialogTitle>
          <DialogDescription className="font-montserrat text-[13px] text-muted-foreground">
            This marks the lead won and moves them into the active client book.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 w-full">
          <div className="bg-[#f8f9fb] border border-[#eaecf2] rounded-lg p-4 flex flex-col gap-1">
            <InfoRow label="Name" value={lead?.name} />
            <InfoRow label="Company" value={lead?.company} />
            <InfoRow label="Email" value={lead?.email} />
            <InfoRow label="Phone" value={lead?.phone} />
            <InfoRow label="Assigned Broker" value={lead?.brokerName} />
          </div>

          <div className="flex items-start gap-3 p-3.5 bg-[#fffdf3] border border-[#fef7d6] rounded-md text-[#bb4d00]">
            <AlertCircle className="size-5 shrink-0 mt-0.5" />
            <p className="font-montserrat text-[12px] leading-relaxed">
              Stage becomes <strong className="font-bold">Won</strong> and status
              becomes <strong className="font-bold">Active</strong>. This is the
              same record — notes, preferences, follow-ups and any trip requests
              they have filed all stay attached. Nothing is copied or duplicated.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/40 w-full">
          <Button
            type="button"
            variant="outline"
            className="h-9 px-4 font-medium text-[13px] gap-1.5"
            onClick={closeModal}
            disabled={isPending}
          >
            <X className="size-3.5" />
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-[#252832] hover:bg-[#252832]/90 text-white h-9 px-5 font-medium text-[13px] gap-2"
            onClick={handleConvert}
            disabled={isPending}
          >
            <UserCheck className="size-4" />
            {isPending ? "Converting…" : "Convert to Client"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
