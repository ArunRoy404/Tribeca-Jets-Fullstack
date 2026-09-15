"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, X, UploadCloud, ArrowRight } from "lucide-react";
import { useClientsStore } from "@/store/useClientsStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DatePicker from "@/components/common/DatePicker";

function FieldWrapper({ label, children, optional }) {
  return (
    <div className="flex flex-col gap-1.5 w-full min-w-0">
      {label && (
        <label className="font-montserrat text-[12px] font-medium text-foreground flex items-center justify-between">
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
    <div className="font-montserrat text-[12px] font-semibold text-muted-foreground pt-1 pb-0.5 border-b border-border/40 uppercase tracking-wide">
      {title}
    </div>
  );
}

export default function AddClientDialog() {
  const open = useClientsStore((s) => s.addModalOpen);
  const editingClient = useClientsStore((s) => s.editingClient);
  const closeModal = useClientsStore((s) => s.closeAddModal);
  const addClient = useClientsStore((s) => s.addClient);
  const updateClient = useClientsStore((s) => s.updateClient);

  const [firstName, setFirstName] = useState("Jonathan");
  const [lastName, setLastName] = useState("Reed");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [clientType, setClientType] = useState("Direct");
  const [initialStatus, setInitialStatus] = useState("Lead");
  const [assignedBroker, setAssignedBroker] = useState("Barry");
  const [leadSource, setLeadSource] = useState("Referral");
  const [followUpDate, setFollowUpDate] = useState("");

  const [prefAirports, setPrefAirports] = useState("");
  const [routeFrom, setRouteFrom] = useState("");
  const [routeTo, setRouteTo] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (editingClient) {
      const parts = (editingClient.name || "").split(" ");
      setFirstName(parts[0] || "");
      setLastName(parts.slice(1).join(" ") || "");
      setCompany(editingClient.company || "");
      setEmail(editingClient.email || "");
      setPhone(editingClient.phone || "");
      setClientType(editingClient.type || "Direct");
      setInitialStatus(editingClient.status || "Active");
      setAssignedBroker(editingClient.broker || "Barry");
      setLeadSource(editingClient.leadSource || "Referral");
      setFollowUpDate(editingClient.nextFollowUpDate || "");
      setPrefAirports(editingClient.prefAirports || "");
      setNotes(editingClient.notes || "");
    } else {
      setFirstName("Jonathan");
      setLastName("Reed");
      setCompany("");
      setEmail("");
      setPhone("");
      setClientType("Direct");
      setInitialStatus("Lead");
      setAssignedBroker("Barry");
      setLeadSource("Referral");
      setFollowUpDate("");
      setPrefAirports("");
      setRouteFrom("");
      setRouteTo("");
      setNotes("");
    }
  }, [editingClient, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const fullName = `${firstName} ${lastName}`.trim();
    const routesStr = routeFrom && routeTo ? `${routeFrom.toUpperCase()} → ${routeTo.toUpperCase()}` : prefAirports;

    const data = {
      name: fullName,
      company,
      type: clientType,
      email,
      phone,
      prefAirports: routesStr || "KTEB → KMIA",
      broker: assignedBroker,
      status: initialStatus,
      leadSource,
      nextFollowUpDate: followUpDate,
      notes,
    };

    if (editingClient) {
      updateClient(editingClient.id, data);
    } else {
      addClient(data);
    }
    closeModal();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeModal()}>
      <DialogContent className="sm:max-w-180 max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-4">
        <DialogHeader className="flex flex-col items-start gap-1 pb-2 border-b border-border">
          <DialogTitle className="font-montserrat font-bold text-[20px] text-foreground">
            {editingClient ? "Edit Client Profile" : "Add New Client"}
          </DialogTitle>
          <DialogDescription className="font-montserrat text-[13px] text-muted-foreground">
            {editingClient ? "Update client profile details in CRM database." : "Create a client record in the CRM database."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
          {/* Section 1: Contact Information */}
          <SectionHeader title="Contact Information" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <FieldWrapper label="First Name">
              <Input
                placeholder="Jonathan"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="h-10 text-[13px] font-montserrat"
                required
              />
            </FieldWrapper>

            <FieldWrapper label="Last Name">
              <Input
                placeholder="Reed"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="h-10 text-[13px] font-montserrat"
                required
              />
            </FieldWrapper>
          </div>

          <FieldWrapper label="Company / Organization" optional>
            <Input
              placeholder="e.g. Sterling Group (optional)"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="h-10 text-[13px] font-montserrat"
            />
          </FieldWrapper>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <FieldWrapper label="Email">
              <Input
                type="email"
                placeholder="client@example.com"
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

          {/* Section 2: Client Profile */}
          <SectionHeader title="Client Profile" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <FieldWrapper label="Client Type">
              <select
                value={clientType}
                onChange={(e) => setClientType(e.target.value)}
                className="h-10 px-3 rounded-md border border-input bg-background font-montserrat text-[13px] text-foreground outline-none focus:ring-1 focus:ring-purple w-full cursor-pointer"
              >
                <option value="Direct">Direct Client</option>
                <option value="Travel Agent">Travel Agent</option>
                <option value="Referral">Referral</option>
                <option value="Corporate">Corporate</option>
              </select>
            </FieldWrapper>

            <FieldWrapper label="Initial Status">
              <select
                value={initialStatus}
                onChange={(e) => setInitialStatus(e.target.value)}
                className="h-10 px-3 rounded-md border border-input bg-background font-montserrat text-[13px] text-foreground outline-none focus:ring-1 focus:ring-purple w-full cursor-pointer"
              >
                <option value="Lead">Lead</option>
                <option value="Active">Active</option>
                <option value="VIP">VIP</option>
                <option value="Quoted">Quoted</option>
                <option value="Inactive">Inactive</option>
              </select>
            </FieldWrapper>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <FieldWrapper label="Assigned Broker">
              <select
                value={assignedBroker}
                onChange={(e) => setAssignedBroker(e.target.value)}
                className="h-10 px-3 rounded-md border border-input bg-background font-montserrat text-[13px] text-foreground outline-none focus:ring-1 focus:ring-purple w-full cursor-pointer"
              >
                <option value="Barry">Barry</option>
                <option value="Benny">Benny</option>
                <option value="Mark">Mark</option>
                <option value="Ari">Ari</option>
              </select>
            </FieldWrapper>

            <FieldWrapper label="Follow-up Date">
              <DatePicker value={followUpDate} onChange={setFollowUpDate} placeholder="Choose Date" />
            </FieldWrapper>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <FieldWrapper label="Lead Source">
              <select
                value={leadSource}
                onChange={(e) => setLeadSource(e.target.value)}
                className="h-10 px-3 rounded-md border border-input bg-background font-montserrat text-[13px] text-foreground outline-none focus:ring-1 focus:ring-purple w-full cursor-pointer"
              >
                <option value="Referral">Referral</option>
                <option value="Web Search">Web Search</option>
                <option value="Direct">Direct</option>
                <option value="Corporate">Corporate</option>
              </select>
            </FieldWrapper>

            <FieldWrapper label="Follow-up Date">
              <DatePicker value={followUpDate} onChange={setFollowUpDate} placeholder="Choose Date" />
            </FieldWrapper>
          </div>

          {/* Section 3: Travel Preferences */}
          <SectionHeader title="Travel Preferences" />

          <FieldWrapper label="Preferred Airports (comma-separated ICAO codes)">
            <Input
              placeholder="e.g. KTEB, KMIA, KJFK"
              value={prefAirports}
              onChange={(e) => setPrefAirports(e.target.value)}
              className="h-10 text-[13px] font-montserrat"
            />
          </FieldWrapper>

          <FieldWrapper label="Preferred Routes">
            <div className="flex items-center gap-2 w-full">
              <Input
                placeholder="e.g. KTEB"
                value={routeFrom}
                onChange={(e) => setRouteFrom(e.target.value)}
                className="h-10 text-[13px] font-montserrat flex-1"
              />
              <ArrowRight className="size-4 text-muted-foreground shrink-0" />
              <Input
                placeholder="e.g. KPBI"
                value={routeTo}
                onChange={(e) => setRouteTo(e.target.value)}
                className="h-10 text-[13px] font-montserrat flex-1"
              />
            </div>
          </FieldWrapper>

          <FieldWrapper label="Internal Notes">
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes visible to brokers only..."
              className="w-full p-2.5 rounded-md border border-input bg-background font-montserrat text-[13px] text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-purple resize-none"
            />
          </FieldWrapper>

          {/* Section 4: Attachment */}
          <SectionHeader title="Attachment" />

          <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-lg bg-secondary/20 hover:bg-secondary/40 transition-colors cursor-pointer text-center gap-2">
            <UploadCloud className="size-8 text-muted-foreground" />
            <p className="font-montserrat text-[13px] text-foreground">
              Drag & drop files here or <span className="text-purple font-semibold">Browse File</span>
            </p>
            <span className="font-montserrat text-[11px] text-muted-foreground">
              Support: PDF, JPG, PNG
            </span>
          </div>

          {/* Footer Buttons - Left-aligned matching Image 2 */}
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
              className="bg-[#252832] hover:bg-[#252832]/90 text-white h-9 px-4 font-medium text-[13px] gap-1.5"
            >
              {editingClient ? <Edit className="size-3.5" /> : <Plus className="size-3.5" />}
              {editingClient ? "Save Client" : "Add Client"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
