"use client";

import { useMemo, useState } from "react";
import { UserCheck, X } from "lucide-react";
import { useLeadsAgentsStore } from "@/store/useLeadsAgentsStore";
import { useUpdateClient } from "@/hooks/clients";
import { useUsers } from "@/hooks/users";
import { personName } from "@/lib/lead";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const SELECT_CLASS =
  "h-10 px-3 rounded-md border border-input bg-background font-montserrat text-[13px] text-foreground outline-none focus:ring-1 focus:ring-purple w-full cursor-pointer";

const BROKER_ROLES = new Set(["BROKER", "SENIOR_BROKER", "ADMIN"]);

/**
 * Reassigns a lead.
 *
 * The API refuses this for a broker — reassignment is an administrator action,
 * so a broker cannot hand their own lead away or claim someone else's. The
 * dialog is only reachable from an action the permission gate already hides
 * from read-only roles; a broker who reaches it anyway gets the API's 403 as a
 * toast rather than a silent failure.
 */
export default function AssignBrokerDialog() {
  const open = useLeadsAgentsStore((s) => s.assignBrokerModalOpen);
  const lead = useLeadsAgentsStore((s) => s.assignBrokerTargetLead);
  const closeModal = useLeadsAgentsStore((s) => s.closeAssignBrokerModal);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && closeModal()}>
      <DialogContent className="sm:max-w-120 p-6 flex flex-col gap-4">
        {open && lead ? (
          <AssignForm key={lead.id} lead={lead} onDone={closeModal} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function AssignForm({ lead, onDone }) {
  const { mutate: updateClient, isPending } = useUpdateClient();
  const { data: users } = useUsers({ limit: 100 });
  const brokers = useMemo(
    () => (users?.data ?? []).filter((u) => BROKER_ROLES.has(u?.role)),
    [users?.data],
  );

  const [brokerId, setBrokerId] = useState(lead?.brokerId ?? "");

  const handleSubmit = (e) => {
    e.preventDefault();
    updateClient(
      { id: lead.id, assignedBrokerId: brokerId || null },
      { onSuccess: onDone },
    );
  };

  return (
    <>
      <DialogHeader className="flex flex-col items-start gap-1 pb-2 border-b border-border">
        <DialogTitle className="font-montserrat font-bold text-[18px] text-foreground">
          Assign Broker
        </DialogTitle>
        <DialogDescription className="font-montserrat text-[13px] text-muted-foreground">
          Who owns <span className="font-bold text-foreground">{lead?.name}</span>?
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
        <select
          value={brokerId}
          onChange={(e) => setBrokerId(e.target.value)}
          className={SELECT_CLASS}
        >
          <option value="">Unassigned</option>
          {brokers.map((broker) => (
            <option key={broker.id} value={broker.id}>
              {personName(broker)}
            </option>
          ))}
        </select>

        <div className="flex items-center justify-end gap-3 pt-2 w-full border-t border-border">
          <Button
            type="button"
            variant="outline"
            className="h-10 px-4 font-medium text-[13px] gap-2"
            onClick={onDone}
            disabled={isPending}
          >
            <X className="size-4" />
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-[#252832] hover:bg-[#252832]/90 text-white h-10 px-5 font-medium text-[13px] gap-2"
            disabled={isPending}
          >
            <UserCheck className="size-4" />
            {isPending ? "Saving…" : "Assign"}
          </Button>
        </div>
      </form>
    </>
  );
}
