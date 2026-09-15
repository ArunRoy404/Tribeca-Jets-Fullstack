"use client";

import { useState, useEffect } from "react";
import { UserPlus, X } from "lucide-react";
import { useLeadsAgentsStore } from "@/store/useLeadsAgentsStore";
import StatusBadge from "@/components/common/StatusBadge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AssignBrokerDialog() {
  const open = useLeadsAgentsStore((s) => s.assignBrokerModalOpen);
  const targetLead = useLeadsAgentsStore((s) => s.assignBrokerTargetLead);
  const agents = useLeadsAgentsStore((s) => s.agents);
  const closeModal = useLeadsAgentsStore((s) => s.closeAssignBrokerModal);
  const assignBroker = useLeadsAgentsStore((s) => s.assignBroker);

  const [selectedBrokerName, setSelectedBrokerName] = useState("Barry Wilson");

  useEffect(() => {
    if (targetLead) {
      const match = agents.find((a) => a.name.toLowerCase().includes(targetLead.broker?.toLowerCase()));
      setSelectedBrokerName(match ? match.name : "Barry Wilson");
    }
  }, [targetLead, agents, open]);

  const selectedAgent =
    agents.find((a) => a.name.toLowerCase() === selectedBrokerName.toLowerCase()) || agents[0];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!targetLead) return;

    const shortBrokerName = selectedAgent.name.split(" ")[0] || "Barry";
    assignBroker(targetLead.id, shortBrokerName);
    closeModal();
  };

  if (!targetLead && !open) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeModal()}>
      <DialogContent className="sm:max-w-150 p-6 flex flex-col gap-4">
        <DialogHeader className="flex flex-col items-start gap-1 pb-2 border-b border-border">
          <DialogTitle className="font-montserrat font-bold text-[20px] text-foreground">
            Assign Broker
          </DialogTitle>
          <DialogDescription className="font-montserrat text-[13px] text-muted-foreground">
            {targetLead?.name || "Lead"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
          <div className="flex flex-col gap-1.5 w-full">
            <label className="font-montserrat text-[13px] font-medium text-foreground">
              Current Broker
            </label>
            <Input
              value={targetLead?.broker || "Barry"}
              readOnly
              className="h-10 text-[13px] font-montserrat bg-secondary/40 text-foreground cursor-not-allowed"
            />
          </div>

          <div className="flex flex-col gap-1.5 w-full">
            <label className="font-montserrat text-[13px] font-medium text-foreground">
              Assign New Broker
            </label>
            <select
              value={selectedBrokerName}
              onChange={(e) => setSelectedBrokerName(e.target.value)}
              className="h-10 px-3 rounded-md border border-input bg-background font-montserrat text-[13px] text-foreground outline-none focus:ring-1 focus:ring-purple w-full cursor-pointer"
            >
              {agents.map((agent) => (
                <option key={agent.id} value={agent.name}>
                  {agent.name} ({agent.role || "Broker"})
                </option>
              ))}
            </select>
          </div>

          {/* Live Workload Summary Box matching Figma Node 318:53253 */}
          {selectedAgent && (
            <div className="grid grid-cols-3 gap-3 p-4 bg-[#f8f9fb] border border-[#eaecf2] rounded-lg items-center">
              <div className="flex flex-col items-center justify-center text-center gap-0.5">
                <span className="font-montserrat font-bold text-[20px] text-foreground">
                  {selectedAgent.activeLeads ?? 4}
                </span>
                <span className="font-montserrat text-[12px] text-muted-foreground">
                  Active Leads
                </span>
              </div>
              <div className="flex flex-col items-center justify-center text-center gap-0.5 border-x border-border/50">
                <span className="font-montserrat font-bold text-[20px] text-foreground">
                  {selectedAgent.followUpsDue ?? 3}
                </span>
                <span className="font-montserrat text-[12px] text-muted-foreground">
                  Follow-ups Due
                </span>
              </div>
              <div className="flex flex-col items-center justify-center text-center gap-1">
                <StatusBadge status={selectedAgent.workload || "Medium"} bordered />
                <span className="font-montserrat text-[12px] text-muted-foreground">Workload</span>
              </div>
            </div>
          )}

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
              type="submit"
              className="bg-[#252832] hover:bg-[#252832]/90 text-white h-9 px-5 font-medium text-[13px] gap-1.5 cursor-pointer"
            >
              <UserPlus className="size-3.5" />
              Assign Broker
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

