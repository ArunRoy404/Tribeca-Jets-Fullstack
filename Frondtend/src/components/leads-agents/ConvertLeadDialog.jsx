"use client";

import { UserCheck, X, AlertCircle } from "lucide-react";
import { useLeadsAgentsStore } from "@/store/useLeadsAgentsStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/40 text-[13px] font-montserrat">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground text-right">{value}</span>
    </div>
  );
}

export default function ConvertLeadDialog() {
  const open = useLeadsAgentsStore((s) => s.convertLeadModalOpen);
  const targetLead = useLeadsAgentsStore((s) => s.convertLeadTargetLead);
  const closeModal = useLeadsAgentsStore((s) => s.closeConvertLeadModal);
  const convertLeadToClient = useLeadsAgentsStore((s) => s.convertLeadToClient);

  const handleConvert = () => {
    if (!targetLead) return;
    convertLeadToClient(targetLead.id);
    closeModal();
  };

  if (!targetLead && !open) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeModal()}>
      <DialogContent className="sm:max-w-150 p-6 flex flex-col gap-4">
        <DialogHeader className="flex flex-col items-start gap-1 pb-2 border-b border-border">
          <DialogTitle className="font-montserrat font-bold text-[20px] text-foreground">
            Convert Lead to Client?
          </DialogTitle>
          <DialogDescription className="font-montserrat text-[13px] text-muted-foreground">
            This will create a new client profile using the lead information.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 w-full">
          {/* Summary Box */}
          <div className="bg-[#f8f9fb] border border-[#eaecf2] rounded-lg p-4 flex flex-col gap-1">
            <InfoRow label="Name" value={targetLead?.name} />
            <InfoRow label="Company" value={targetLead?.company} />
            <InfoRow label="Email" value={targetLead?.email} />
            <InfoRow label="Phone" value={targetLead?.phone} />
            <InfoRow label="Assigned Broker" value={targetLead?.broker} />
          </div>

          {/* Yellow Alert Box matching Figma Node 318:53511 */}
          <div className="flex items-start gap-3 p-3.5 bg-[#fffdf3] border border-[#fef7d6] rounded-md text-[#bb4d00]">
            <AlertCircle className="size-5 shrink-0 mt-0.5" />
            <p className="font-montserrat text-[12px] leading-relaxed">
              Lead status will be set to <strong className="font-bold">Won</strong> and a client record
              will be created automatically in CRM.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-start gap-3 pt-3 border-t border-border/40 w-full">
          <Button
            type="button"
            variant="outline"
            className="h-9 px-4 font-medium text-[13px] gap-1.5"
            onClick={closeModal}
          >
            <X className="size-3.5" />
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConvert}
            className="bg-[#252832] hover:bg-[#252832]/90 text-white h-9 px-5 font-medium text-[13px] gap-1.5 cursor-pointer"
          >
            <UserCheck className="size-3.5" />
            Convert to Client
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

