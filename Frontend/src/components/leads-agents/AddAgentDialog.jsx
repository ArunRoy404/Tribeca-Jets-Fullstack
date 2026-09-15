"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, X } from "lucide-react";
import { useLeadsAgentsStore } from "@/store/useLeadsAgentsStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function FieldWrapper({ label, children, optional }) {
  return (
    <div className="flex flex-col gap-1.5 w-full min-w-0">
      {label && (
        <label className="font-montserrat text-[13px] font-medium text-foreground flex items-center justify-between">
          <span>{label}</span>
          {optional && <span className="text-muted-foreground font-normal text-[11px]">(Optional)</span>}
        </label>
      )}
      {children}
    </div>
  );
}

function SectionHeader({ title }) {
  return (
    <div className="font-montserrat text-[14px] font-semibold text-muted-foreground pt-2 pb-1 border-b border-border/40">
      {title}
    </div>
  );
}

const followUpOptions = ["Call", "Email", "WhatsApp", "Other"];

export default function AddAgentDialog() {
  const open = useLeadsAgentsStore((s) => s.addModalOpen);
  const editingAgent = useLeadsAgentsStore((s) => s.editingAgent);
  const closeModal = useLeadsAgentsStore((s) => s.closeAddModal);
  const addAgent = useLeadsAgentsStore((s) => s.addAgent);
  const updateAgent = useLeadsAgentsStore((s) => s.updateAgent);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");

  const [role, setRole] = useState("Broker");
  const [status, setStatus] = useState("Active");
  const [permissionLevel, setPermissionLevel] = useState("Medium");

  const [maxLeadCapacity, setMaxLeadCapacity] = useState("15");
  const [defaultFollowUp, setDefaultFollowUp] = useState("Call");

  useEffect(() => {
    if (editingAgent) {
      const parts = (editingAgent.name || "").split(" ");
      setFirstName(parts[0] || "");
      setLastName(parts.slice(1).join(" ") || "");
      setEmail(editingAgent.email || "");
      setPhone(editingAgent.phone || "");
      setCompany(editingAgent.company || "Tribeca Jets");
      setRole(editingAgent.role || "Broker");
      setStatus(editingAgent.status || "Active");
      setPermissionLevel(editingAgent.permissionLevel || "Medium");
      setMaxLeadCapacity(String(editingAgent.maxLeadCapacity || "15"));
      setDefaultFollowUp(editingAgent.defaultFollowUp || "Call");
    } else {
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setCompany("Tribeca Jets");
      setRole("Broker");
      setStatus("Active");
      setPermissionLevel("Medium");
      setMaxLeadCapacity("15");
      setDefaultFollowUp("Call");
    }
  }, [editingAgent, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const fullName = `${firstName} ${lastName}`.trim();
    const data = {
      name: fullName,
      email,
      phone,
      company,
      role,
      status,
      permissionLevel,
      maxLeadCapacity: parseInt(maxLeadCapacity, 10) || 15,
      defaultFollowUp,
    };

    if (editingAgent) {
      updateAgent(editingAgent.id, data);
    } else {
      addAgent(data);
    }
    closeModal();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeModal()}>
      <DialogContent className="sm:max-w-180 max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-4">
        <DialogHeader className="flex flex-col items-start gap-1 pb-2 border-b border-border">
          <DialogTitle className="font-montserrat font-bold text-[20px] text-foreground">
            {editingAgent ? "Edit Agent Profile" : "Add New Agent"}
          </DialogTitle>
          <DialogDescription className="font-montserrat text-[13px] text-muted-foreground">
            {editingAgent
              ? "Update broker ownership and access permissions in CRM."
              : "Register a new broker/agent with assigned workload capacity."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
          {/* Section 1: Personal Information */}
          <SectionHeader title="Personal Information" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <FieldWrapper label="First Name">
              <Input
                placeholder="Barry"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="h-10 text-[13px] font-montserrat"
                required
              />
            </FieldWrapper>

            <FieldWrapper label="Last Name">
              <Input
                placeholder="Wilson"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="h-10 text-[13px] font-montserrat"
                required
              />
            </FieldWrapper>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <FieldWrapper label="Email">
              <Input
                type="email"
                placeholder="barry@tribecajets.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 text-[13px] font-montserrat"
                required
              />
            </FieldWrapper>

            <FieldWrapper label="Phone">
              <Input
                placeholder="+1 (212) 555-0100"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-10 text-[13px] font-montserrat"
                required
              />
            </FieldWrapper>
          </div>

          {/* Section 2: Role & Access */}
          <SectionHeader title="Role & Access" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <FieldWrapper label="Role">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="h-10 px-3 rounded-md border border-input bg-background font-montserrat text-[13px] text-foreground outline-none focus:ring-1 focus:ring-purple w-full cursor-pointer"
              >
                <option value="Broker">Broker</option>
                <option value="Senior Broker">Senior Broker</option>
                <option value="Admin">Admin</option>
                <option value="Dispatcher">Dispatcher</option>
              </select>
            </FieldWrapper>

            <FieldWrapper label="Status">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="h-10 px-3 rounded-md border border-input bg-background font-montserrat text-[13px] text-foreground outline-none focus:ring-1 focus:ring-purple w-full cursor-pointer"
              >
                <option value="Active">Active</option>
                <option value="Qualified">Qualified</option>
                <option value="Inactive">Inactive</option>
              </select>
            </FieldWrapper>
          </div>

          <FieldWrapper label="Permission Level">
            <select
              value={permissionLevel}
              onChange={(e) => setPermissionLevel(e.target.value)}
              className="h-10 px-3 rounded-md border border-input bg-background font-montserrat text-[13px] text-foreground outline-none focus:ring-1 focus:ring-purple w-full cursor-pointer"
            >
              <option value="Low">Low (View Only)</option>
              <option value="Medium">Medium (Standard Broker)</option>
              <option value="High">High (Senior Broker & Sourcing)</option>
              <option value="Admin">Admin (Full Control)</option>
            </select>
          </FieldWrapper>

          {/* Section 3: Workload */}
          <SectionHeader title="Workload" />

          <FieldWrapper label="Maximum Active Leads">
            <Input
              type="number"
              min="1"
              max="100"
              placeholder="15"
              value={maxLeadCapacity}
              onChange={(e) => setMaxLeadCapacity(e.target.value)}
              className="h-10 text-[13px] font-montserrat"
              required
            />
          </FieldWrapper>

          <FieldWrapper label="Default Follow-up">
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {followUpOptions.map((opt) => {
                const isActive = defaultFollowUp === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setDefaultFollowUp(opt)}
                    className={cn(
                      "px-5 py-2 rounded-md font-montserrat text-[13px] font-medium transition-all cursor-pointer border",
                      isActive
                        ? "bg-[#252832] text-white border-[#252832]"
                        : "bg-[#f3f4f8] text-[#252832] border-[#ddddde] hover:bg-white"
                    )}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </FieldWrapper>

          {/* Footer Actions matching Figma Node 318:51959 */}
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
              {editingAgent ? <Edit className="size-3.5" /> : <Plus className="size-3.5" />}
              {editingAgent ? "Save Changes" : "Create Agent"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

