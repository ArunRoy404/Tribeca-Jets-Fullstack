"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, X, Calendar, Clock } from "lucide-react";
import { useLeadsAgentsStore } from "@/store/useLeadsAgentsStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

function FieldWrapper({ label, children, optional }) {
  return (
    <div className="flex flex-col gap-1.5 w-full min-w-0">
      {label && (
        <label className="font-montserrat text-[13px] font-medium text-foreground flex items-center justify-between">
          <span>{label}</span>
          {optional && (
            <span className="text-muted-foreground font-normal text-[11px]">(Optional)</span>
          )}
        </label>
      )}
      {children}
    </div>
  );
}

function SectionHeader({ title }) {
  return (
    <div className="font-montserrat text-[14px] font-semibold text-muted-foreground pt-3 pb-1 border-b border-border/40">
      {title}
    </div>
  );
}

const followUpOptions = ["Call", "Email", "WhatsApp", "Other"];

export default function AddLeadDialog() {
  const open = useLeadsAgentsStore((s) => s.addLeadModalOpen);
  const editingLead = useLeadsAgentsStore((s) => s.editingLead);
  const closeModal = useLeadsAgentsStore((s) => s.closeAddLeadModal);
  const addLead = useLeadsAgentsStore((s) => s.addLead);
  const updateLead = useLeadsAgentsStore((s) => s.updateLead);

  // Section 1: Contact Information
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Section 2: Lead Information
  const [source, setSource] = useState("Direct");
  const [status, setStatus] = useState("New");
  const [priority, setPriority] = useState("Medium");
  const [broker, setBroker] = useState("Barry");
  const [interest, setInterest] = useState("");

  // Section 3: Trip Interest
  const [departureAirport, setDepartureAirport] = useState("KTEB");
  const [destinationAirport, setDestinationAirport] = useState("KMIA");
  const [departureDate, setDepartureDate] = useState("2026-08-15");
  const [returnDate, setReturnDate] = useState("2026-08-17");
  const [passengers, setPassengers] = useState("4");
  const [aircraftPreference, setAircraftPreference] = useState("No preference");
  const [tripNotes, setTripNotes] = useState("");

  // Section 4: Follow-up
  const [followUpDate, setFollowUpDate] = useState("2026-08-12");
  const [followUpTime, setFollowUpTime] = useState("10:00 AM");
  const [followUpMethod, setFollowUpMethod] = useState("Call");
  const [internalNotes, setInternalNotes] = useState("");

  useEffect(() => {
    if (editingLead) {
      const parts = (editingLead.name || "").split(" ");
      setFirstName(parts[0] || "");
      setLastName(parts.slice(1).join(" ") || "");
      setCompany(editingLead.company || "");
      setEmail(editingLead.email || "");
      setPhone(editingLead.phone || "");
      setSource(editingLead.source || "Direct");
      setStatus(editingLead.status || "New");
      setPriority(editingLead.priority || "Medium");
      setBroker(editingLead.broker || "Barry");
      setInterest(editingLead.interest || "");
      setDepartureAirport(editingLead.departureAirport || "KTEB");
      setDestinationAirport(editingLead.destinationAirport || "KMIA");
      setDepartureDate(editingLead.departureDate || "2026-08-15");
      setReturnDate(editingLead.returnDate || "2026-08-17");
      setPassengers(String(editingLead.passengers || "4").replace(/[^0-9]/g, ""));
      setAircraftPreference(editingLead.aircraftPreference || "No preference");
      setTripNotes(editingLead.tripNotes || "");
      setFollowUpDate(editingLead.nextFollowUp || "2026-08-12");
      setFollowUpTime(editingLead.followUpTime || "10:00 AM");
      setFollowUpMethod(editingLead.followUpMethod || "Call");
      setInternalNotes(editingLead.internalNotes || "");
    } else {
      setFirstName("");
      setLastName("");
      setCompany("");
      setEmail("");
      setPhone("");
      setSource("Direct");
      setStatus("New");
      setPriority("Medium");
      setBroker("Barry");
      setInterest("");
      setDepartureAirport("KTEB");
      setDestinationAirport("KMIA");
      setDepartureDate("2026-08-15");
      setReturnDate("2026-08-17");
      setPassengers("4");
      setAircraftPreference("No preference");
      setTripNotes("");
      setFollowUpDate("2026-08-12");
      setFollowUpTime("10:00 AM");
      setFollowUpMethod("Call");
      setInternalNotes("");
    }
  }, [editingLead, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const fullName = `${firstName} ${lastName}`.trim();
    const origin = departureAirport.replace(/^K/, "");
    const destination = destinationAirport.replace(/^K/, "");

    const data = {
      name: fullName,
      company: company || "Direct Client",
      email,
      phone,
      source,
      status,
      priority,
      broker,
      interest: interest || `${origin} → ${destination} charter`,
      origin,
      destination,
      departureAirport,
      destinationAirport,
      departureDate,
      returnDate,
      passengers,
      aircraftPreference,
      tripNotes,
      nextFollowUp: followUpDate,
      followUpTime,
      followUpMethod,
      internalNotes,
    };

    if (editingLead) {
      updateLead(editingLead.id, data);
    } else {
      addLead(data);
    }
    closeModal();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeModal()}>
      <DialogContent className="sm:max-w-200 max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-4">
        <DialogHeader className="flex flex-col items-start gap-1 pb-2 border-b border-border">
          <DialogTitle className="font-montserrat font-bold text-[20px] text-foreground">
            {editingLead ? "Edit Lead Information" : "Add New Lead"}
          </DialogTitle>
          <DialogDescription className="font-montserrat text-[13px] text-muted-foreground">
            {editingLead
              ? "Update prospect specifications, trip itinerary, and assigned broker."
              : "Capture inbound charter inquiry with contact, trip interest, and follow-up requirements."}
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

          <FieldWrapper label="Company" optional>
            <Input
              placeholder="Reed Capital"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="h-10 text-[13px] font-montserrat"
            />
          </FieldWrapper>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <FieldWrapper label="Email">
              <Input
                type="email"
                placeholder="j.reed@reedcapital.com"
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

          {/* Section 2: Lead Information */}
          <SectionHeader title="Lead Information" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <FieldWrapper label="Lead Source">
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="h-10 px-3 rounded-md border border-input bg-background font-montserrat text-[13px] text-foreground outline-none focus:ring-1 focus:ring-purple w-full cursor-pointer"
              >
                <option value="Direct">Direct</option>
                <option value="Referral">Referral</option>
                <option value="Website">Website</option>
                <option value="Email">Email</option>
                <option value="Corporate">Corporate</option>
              </select>
            </FieldWrapper>

            <FieldWrapper label="Lead Status">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="h-10 px-3 rounded-md border border-input bg-background font-montserrat text-[13px] text-foreground outline-none focus:ring-1 focus:ring-purple w-full cursor-pointer"
              >
                <option value="New">New</option>
                <option value="Contacted">Contacted</option>
                <option value="Qualified">Qualified</option>
                <option value="Proposal">Proposal</option>
                <option value="Quoted">Quoted</option>
                <option value="Won">Won</option>
                <option value="Lost">Lost</option>
              </select>
            </FieldWrapper>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <FieldWrapper label="Priority">
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="h-10 px-3 rounded-md border border-input bg-background font-montserrat text-[13px] text-foreground outline-none focus:ring-1 focus:ring-purple w-full cursor-pointer"
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </FieldWrapper>

            <FieldWrapper label="Assigned Broker">
              <select
                value={broker}
                onChange={(e) => setBroker(e.target.value)}
                className="h-10 px-3 rounded-md border border-input bg-background font-montserrat text-[13px] text-foreground outline-none focus:ring-1 focus:ring-purple w-full cursor-pointer"
              >
                <option value="Barry">Barry Wilson</option>
                <option value="Mark">Mark Evans</option>
                <option value="Benny">Benny Carter</option>
                <option value="Ari">Ari Wohl</option>
              </select>
            </FieldWrapper>
          </div>

          <FieldWrapper label="Lead Interest">
            <Input
              placeholder="NYC → Miami, business charter…"
              value={interest}
              onChange={(e) => setInterest(e.target.value)}
              className="h-10 text-[13px] font-montserrat"
            />
          </FieldWrapper>

          {/* Section 3: Trip Interest */}
          <SectionHeader title="Trip Interest" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <FieldWrapper label="Departure Airport">
              <Input
                placeholder="KTEB"
                value={departureAirport}
                onChange={(e) => setDepartureAirport(e.target.value.toUpperCase())}
                className="h-10 text-[13px] font-montserrat uppercase"
              />
            </FieldWrapper>

            <FieldWrapper label="Destination Airport">
              <Input
                placeholder="KPBI"
                value={destinationAirport}
                onChange={(e) => setDestinationAirport(e.target.value.toUpperCase())}
                className="h-10 text-[13px] font-montserrat uppercase"
              />
            </FieldWrapper>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <FieldWrapper label="Preferred Departure">
              <Input
                type="date"
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
                className="h-10 text-[13px] font-montserrat"
              />
            </FieldWrapper>

            <FieldWrapper label="Return Date" optional>
              <Input
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                className="h-10 text-[13px] font-montserrat"
              />
            </FieldWrapper>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <FieldWrapper label="Passengers">
              <Input
                type="number"
                min="1"
                max="50"
                value={passengers}
                onChange={(e) => setPassengers(e.target.value)}
                className="h-10 text-[13px] font-montserrat"
              />
            </FieldWrapper>

            <FieldWrapper label="Aircraft Preference">
              <select
                value={aircraftPreference}
                onChange={(e) => setAircraftPreference(e.target.value)}
                className="h-10 px-3 rounded-md border border-input bg-background font-montserrat text-[13px] text-foreground outline-none focus:ring-1 focus:ring-purple w-full cursor-pointer"
              >
                <option value="No preference">No preference</option>
                <option value="Light Jet">Light Jet</option>
                <option value="Midsize Jet">Midsize Jet</option>
                <option value="Super Midsize">Super Midsize</option>
                <option value="Heavy Jet">Heavy Jet</option>
                <option value="Ultra Long Range">Ultra Long Range</option>
                <option value="Turboprop">Turboprop</option>
              </select>
            </FieldWrapper>
          </div>

          <FieldWrapper label="Trip Notes" optional>
            <Textarea
              placeholder="Catering, ground transport, special requests…"
              value={tripNotes}
              onChange={(e) => setTripNotes(e.target.value)}
              className="min-h-20 text-[13px] font-montserrat resize-none"
            />
          </FieldWrapper>

          {/* Section 4: Follow-up */}
          <SectionHeader title="Follow-up" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <FieldWrapper label="Follow-up Date">
              <Input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="h-10 text-[13px] font-montserrat"
              />
            </FieldWrapper>

            <FieldWrapper label="Follow-up Time">
              <Input
                placeholder="10:00 AM"
                value={followUpTime}
                onChange={(e) => setFollowUpTime(e.target.value)}
                className="h-10 text-[13px] font-montserrat"
              />
            </FieldWrapper>
          </div>

          <FieldWrapper label="Follow-up Method">
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {followUpOptions.map((opt) => {
                const isActive = followUpMethod === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setFollowUpMethod(opt)}
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

          <FieldWrapper label="Internal Notes" optional>
            <Textarea
              placeholder="Internal notes visible to brokers only…"
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              className="min-h-20 text-[13px] font-montserrat resize-none"
            />
          </FieldWrapper>

          {/* Footer Actions */}
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
              {editingLead ? <Edit className="size-3.5" /> : <Plus className="size-3.5" />}
              {editingLead ? "Save Changes" : "Save Lead"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

