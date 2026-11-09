"use client";

import { Check, ExternalLink, FileSignature, Send } from "lucide-react";
import DetailCard from "@/components/trips/DetailCard";
import StatusBadge from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { useUpdateTrip } from "@/hooks/trips";
import { usePermissions } from "@/hooks/common/usePermissions";
import { Action, Module } from "@/lib/access";

const AVANODE_URL = "https://www.avanode.com";
const DOCUSIGN_URL = "https://app.docusign.com";

/**
 * Contract Management Card (Batch 3 - CRM Feedback 8.1, 8.2, 8.3)
 * Tracks Contract Sent / Received statuses and provides direct launch
 * buttons for Avanode and DocuSign.
 */
export default function TripContractCard({ trip }) {
  const { canAccess } = usePermissions();
  const mayEdit = canAccess(Module.TRIPS, Action.EDIT);
  const { mutate: updateTrip, isPending: updating } = useUpdateTrip();

  const isSent = Boolean(trip?.contractSent);
  const isReceived = Boolean(trip?.contractReceived);

  const statusLabel = isReceived
    ? "Contract Received"
    : isSent
      ? "Contract Sent"
      : "Draft / Not Sent";

  const toggleSent = () => {
    updateTrip({
      id: trip?.id,
      contractSent: !isSent,
    });
  };

  const toggleReceived = () => {
    updateTrip({
      id: trip?.id,
      contractReceived: !isReceived,
    });
  };

  return (
    <div id="contract-card">
      <DetailCard title="Contract Management">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-border/60">
            <span className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">
              Status
            </span>
            <StatusBadge status={isReceived ? "Approved" : isSent ? "Sent" : "Draft"} bordered />
          </div>

          <div className="flex flex-col gap-1.5 text-[12px]">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Contract Status:</span>
              <span className="font-semibold text-foreground">{statusLabel}</span>
            </div>
            {isSent && trip?.contractSentAt && (
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Sent On:</span>
                <span className="text-foreground">{trip.contractSentAt}</span>
              </div>
            )}
            {isReceived && trip?.contractReceivedAt && (
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Received On:</span>
                <span className="text-foreground">{trip.contractReceivedAt}</span>
              </div>
            )}
          </div>

          {mayEdit && (
            <div className="flex flex-wrap gap-2 pt-1 border-t border-border/40">
              <Button
                type="button"
                variant={isSent ? "outline" : "default"}
                size="sm"
                disabled={updating}
                onClick={toggleSent}
                className="gap-1.5 h-8 text-[12px] flex-1 min-w-[120px]"
              >
                <Send className="size-3.5" />
                {isSent ? "Mark Not Sent" : "Mark Contract Sent"}
              </Button>
              <Button
                type="button"
                variant={isReceived ? "outline" : "success"}
                size="sm"
                disabled={updating}
                onClick={toggleReceived}
                className="gap-1.5 h-8 text-[12px] flex-1 min-w-[120px]"
              >
                <Check className="size-3.5" />
                {isReceived ? "Mark Unreceived" : "Mark Received"}
              </Button>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-2 border-t border-border/60">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              External Sourcing & Signing
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-9 px-3 gap-1.5 text-[12px] font-medium border-border hover:bg-secondary/60 justify-center"
              >
                <a href={AVANODE_URL} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="size-3.5 text-purple" />
                  Create Contract (Avanode)
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-9 px-3 gap-1.5 text-[12px] font-medium border-border hover:bg-secondary/60 justify-center"
              >
                <a href={DOCUSIGN_URL} target="_blank" rel="noopener noreferrer">
                  <FileSignature className="size-3.5 text-purple" />
                  DocuSign
                </a>
              </Button>
            </div>
          </div>
        </div>
      </DetailCard>
    </div>
  );
}
