"use client";

import { useMemo, useState } from "react";
import { Plus, Edit, X } from "lucide-react";
import { useLeadsAgentsStore } from "@/store/useLeadsAgentsStore";
import { useCreateClient, useUpdateClient } from "@/hooks/clients";
import { useCreateTripRequest } from "@/hooks/trip-requests";
import { useUsers } from "@/hooks/users";
import { useAirports } from "@/hooks/airports";
import {
  FOLLOW_UP_METHODS,
  LEAD_PRIORITIES,
  LEAD_SOURCES,
  LEAD_STAGES,
  formatFollowUpMethod,
  formatLeadSource,
  formatLeadStage,
  formatPriority,
  personName,
} from "@/lib/lead";
import {
  FILTERABLE_AIRCRAFT_CATEGORIES,
  formatAircraftCategory,
} from "@/lib/aircraft";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DatePicker from "@/components/common/DatePicker";

function FieldWrapper({ label, children, optional }) {
  return (
    <div className="flex flex-col gap-1.5 w-full min-w-0">
      {label && (
        <label className="font-montserrat text-[12px] font-medium text-foreground flex items-center justify-between">
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

function SectionHeader({ title, hint }) {
  return (
    <div className="flex flex-col gap-0.5 pt-1 pb-0.5 border-b border-border/40">
      <span className="font-montserrat text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">
        {title}
      </span>
      {hint ? (
        <span className="font-montserrat text-[11px] text-muted-foreground normal-case">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

const SELECT_CLASS =
  "h-10 px-3 rounded-md border border-input bg-background font-montserrat text-[13px] text-foreground outline-none focus:ring-1 focus:ring-purple w-full cursor-pointer";

const BROKER_ROLES = new Set(["BROKER", "SENIOR_BROKER", "ADMIN"]);

/**
 * Empty, not pre-filled.
 *
 * Only the two closed lists that have a real default — a new lead genuinely is
 * NEW, and MEDIUM priority is the "nobody has decided" value the API stores
 * anyway. Everything else starts blank so a hurried save cannot invent a
 * person, a route or a budget.
 */
const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  companyName: "",
  email: "",
  phone: "",
  leadSource: "",
  leadStage: "NEW",
  priority: "MEDIUM",
  assignedBrokerId: "",
  nextFollowUpAt: "",
  followUpMethod: "",
  // The enquiry half — written as a separate TripRequest record.
  summary: "",
  originAirportId: "",
  destinationAirportId: "",
  departureDate: "",
  returnDate: "",
  passengers: "",
  aircraftPreference: "",
  estimatedValue: "",
  requirements: "",
};

const fieldValue = (value) => (!value || value === "—" ? "" : String(value));
const dateValue = (value) => (value ? String(value).slice(0, 10) : "");
const optional = (value) => {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimmed : undefined;
};
/** A blank numeric box must never become 0 — `Number('')` is 0. */
const numeric = (value) => {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
};

function initialForm(lead) {
  if (!lead) return EMPTY_FORM;
  return {
    ...EMPTY_FORM,
    firstName: fieldValue(lead.firstName),
    lastName: fieldValue(lead.lastName),
    companyName: fieldValue(lead.company),
    email: fieldValue(lead.email),
    phone: fieldValue(lead.phone),
    leadSource: lead.rawSource || "",
    leadStage: lead.rawStage || "NEW",
    priority: lead.rawPriority || "MEDIUM",
    assignedBrokerId: lead.brokerId ?? "",
    nextFollowUpAt: dateValue(lead.rawNextFollowUpAt),
    followUpMethod: lead.rawFollowUpMethod || "",
  };
}

export default function AddLeadDialog() {
  const open = useLeadsAgentsStore((s) => s.addLeadModalOpen);
  const editingLead = useLeadsAgentsStore((s) => s.editingLead);
  const closeModal = useLeadsAgentsStore((s) => s.closeAddLeadModal);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && closeModal()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-4">
        {/* Keyed so the form remounts with fresh state whenever the dialog
            opens on a different lead — React's own answer to "reset state when
            a prop changes". */}
        {open && (
          <LeadForm
            key={editingLead?.id ?? "new"}
            editingLead={editingLead}
            onDone={closeModal}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function LeadForm({ editingLead, onDone }) {
  const { mutate: createClient, isPending: isCreating } = useCreateClient();
  const { mutate: updateClient, isPending: isUpdating } = useUpdateClient();
  const { mutateAsync: createRequest } = useCreateTripRequest();
  const editing = Boolean(editingLead);

  const { data: users } = useUsers({ limit: 100 });
  const brokers = useMemo(
    () => (users?.data ?? []).filter((u) => BROKER_ROLES.has(u?.role)),
    [users?.data],
  );
  const { data: airports } = useAirports({
    limit: 100,
    sortBy: "icao",
    sortOrder: "asc",
  });

  const [form, setForm] = useState(() => initialForm(editingLead));
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();

    // The person. A lead is a Client at lead stage — there is no separate
    // leads table, so this is an ordinary client record.
    const client = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      companyName: optional(form.companyName),
      email: optional(form.email)?.toLowerCase(),
      phone: optional(form.phone),
      type: "DIRECT",
      status: "LEAD",
      leadStage: form.leadStage,
      leadSource: form.leadSource || "DIRECT",
      priority: form.priority,
      followUpMethod: form.followUpMethod || null,
      assignedBrokerId: optional(form.assignedBrokerId),
      nextFollowUpAt: form.nextFollowUpAt
        ? new Date(`${form.nextFollowUpAt}T00:00`).toISOString()
        : null,
    };

    if (editing) {
      // Editing touches the person only. The enquiry is its own record with
      // its own edit path — rewriting it from here would silently overwrite a
      // request the broker has since worked on.
      updateClient({ id: editingLead.id, ...client }, { onSuccess: onDone });
      return;
    }

    // Anything typed into the enquiry half becomes a TripRequest. Nothing
    // there is required: a lead can arrive as a name and a phone number.
    const enquiry = {
      summary: optional(form.summary),
      originAirportId: form.originAirportId || null,
      destinationAirportId: form.destinationAirportId || null,
      departureDate: optional(form.departureDate),
      returnDate: optional(form.returnDate),
      passengers: numeric(form.passengers),
      aircraftPreference: form.aircraftPreference || undefined,
      estimatedValue: numeric(form.estimatedValue),
      requirements: optional(form.requirements),
      source: form.leadSource || "DIRECT",
    };
    const hasEnquiry = Object.values(enquiry).some(
      (value) => value !== undefined && value !== null && value !== "DIRECT",
    );

    createClient(client, {
      onSuccess: async (created) => {
        if (hasEnquiry && created?.id) {
          // Silent: the client toast already fired, and one save should not
          // stack two notifications.
          await createRequest({
            ...enquiry,
            clientId: created.id,
            assignedBrokerId: client.assignedBrokerId ?? null,
            silent: true,
          });
        }
        onDone();
      },
    });
  };

  const isPending = isCreating || isUpdating;

  return (
    <>
      <DialogHeader className="flex flex-col items-start gap-1 pb-2 border-b border-border">
        <DialogTitle className="font-montserrat font-bold text-[20px] text-foreground">
          {editing ? "Edit Lead" : "Add Lead"}
        </DialogTitle>
        <DialogDescription className="font-montserrat text-[13px] text-muted-foreground">
          {editing
            ? "Update the person. Their enquiries are edited from the lead's detail page."
            : "A lead is a person and what they asked for. The enquiry below is saved as a trip request — leave it blank if they have not said yet."}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
        <SectionHeader title="Contact" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          <FieldWrapper label="First Name">
            <Input
              placeholder="Jonathan"
              value={form.firstName}
              onChange={(e) => set("firstName", e.target.value)}
              required
            />
          </FieldWrapper>
          <FieldWrapper label="Last Name">
            <Input
              placeholder="Reed"
              value={form.lastName}
              onChange={(e) => set("lastName", e.target.value)}
              required
            />
          </FieldWrapper>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
          <FieldWrapper label="Company" optional>
            <Input
              placeholder="Reed Capital"
              value={form.companyName}
              onChange={(e) => set("companyName", e.target.value)}
            />
          </FieldWrapper>
          <FieldWrapper label="Email" optional>
            <Input
              type="email"
              placeholder="j.reed@reedcapital.com"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </FieldWrapper>
          <FieldWrapper label="Phone" optional>
            <Input
              placeholder="+1 (212) 555-0100"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
          </FieldWrapper>
        </div>

        <SectionHeader title="Pipeline" />

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 w-full">
          <FieldWrapper label="Source" optional>
            <select
              value={form.leadSource}
              onChange={(e) => set("leadSource", e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="">Not recorded</option>
              {LEAD_SOURCES.map((value) => (
                <option key={value} value={value}>
                  {formatLeadSource(value)}
                </option>
              ))}
            </select>
          </FieldWrapper>

          <FieldWrapper label="Stage">
            <select
              value={form.leadStage}
              onChange={(e) => set("leadStage", e.target.value)}
              className={SELECT_CLASS}
            >
              {LEAD_STAGES.map((value) => (
                <option key={value} value={value}>
                  {formatLeadStage(value)}
                </option>
              ))}
            </select>
          </FieldWrapper>

          <FieldWrapper label="Priority">
            <select
              value={form.priority}
              onChange={(e) => set("priority", e.target.value)}
              className={SELECT_CLASS}
            >
              {LEAD_PRIORITIES.map((value) => (
                <option key={value} value={value}>
                  {formatPriority(value)}
                </option>
              ))}
            </select>
          </FieldWrapper>

          <FieldWrapper label="Assigned Broker" optional>
            <select
              value={form.assignedBrokerId}
              onChange={(e) => set("assignedBrokerId", e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="">Unassigned</option>
              {brokers.map((broker) => (
                <option key={broker.id} value={broker.id}>
                  {personName(broker)}
                </option>
              ))}
            </select>
          </FieldWrapper>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          <FieldWrapper label="Next Follow-up" optional>
            <DatePicker
              value={form.nextFollowUpAt}
              onChange={(value) => set("nextFollowUpAt", value)}
              placeholder="Choose Date"
            />
          </FieldWrapper>
          <FieldWrapper label="Follow-up Method" optional>
            <select
              value={form.followUpMethod}
              onChange={(e) => set("followUpMethod", e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="">Not decided</option>
              {FOLLOW_UP_METHODS.map((value) => (
                <option key={value} value={value}>
                  {formatFollowUpMethod(value)}
                </option>
              ))}
            </select>
          </FieldWrapper>
        </div>

        {/* The enquiry half. Only on create — an existing lead's requests are
            their own records, edited from the detail page, and rewriting one
            from here would overwrite work the broker has since done on it. */}
        {editing ? null : (
          <>
            <SectionHeader
              title="Enquiry"
              hint="Saved as a trip request against this lead. Leave blank if they have not said yet."
            />

            <FieldWrapper label="What they asked for" optional>
              <Input
                placeholder="NYC → Miami, business charter"
                value={form.summary}
                onChange={(e) => set("summary", e.target.value)}
              />
            </FieldWrapper>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              <FieldWrapper label="From" optional>
                <select
                  value={form.originAirportId}
                  onChange={(e) => set("originAirportId", e.target.value)}
                  className={SELECT_CLASS}
                >
                  <option value="">Not known</option>
                  {(airports?.data ?? []).map((airport) => (
                    <option key={airport.id} value={airport.id}>
                      {airport.icao} — {airport.name}
                    </option>
                  ))}
                </select>
              </FieldWrapper>
              <FieldWrapper label="To" optional>
                <select
                  value={form.destinationAirportId}
                  onChange={(e) => set("destinationAirportId", e.target.value)}
                  className={SELECT_CLASS}
                >
                  <option value="">Not known</option>
                  {(airports?.data ?? []).map((airport) => (
                    <option key={airport.id} value={airport.id}>
                      {airport.icao} — {airport.name}
                    </option>
                  ))}
                </select>
              </FieldWrapper>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 w-full">
              <FieldWrapper label="Departure" optional>
                <DatePicker
                  value={form.departureDate}
                  onChange={(value) => set("departureDate", value)}
                  placeholder="Choose Date"
                />
              </FieldWrapper>
              <FieldWrapper label="Return" optional>
                <DatePicker
                  value={form.returnDate}
                  onChange={(value) => set("returnDate", value)}
                  placeholder="One way"
                />
              </FieldWrapper>
              <FieldWrapper label="Passengers" optional>
                <Input
                  type="number"
                  min="1"
                  placeholder="4"
                  value={form.passengers}
                  onChange={(e) => set("passengers", e.target.value)}
                />
              </FieldWrapper>
              <FieldWrapper label="Est. Value" optional>
                <Input
                  type="number"
                  min="0"
                  placeholder="28000"
                  value={form.estimatedValue}
                  onChange={(e) => set("estimatedValue", e.target.value)}
                />
              </FieldWrapper>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              <FieldWrapper label="Aircraft Preference" optional>
                <select
                  value={form.aircraftPreference}
                  onChange={(e) => set("aircraftPreference", e.target.value)}
                  className={SELECT_CLASS}
                >
                  <option value="">No preference</option>
                  {FILTERABLE_AIRCRAFT_CATEGORIES.map((value) => (
                    <option key={value} value={value}>
                      {formatAircraftCategory(value)}
                    </option>
                  ))}
                </select>
              </FieldWrapper>
              <FieldWrapper label="Requirements" optional>
                <Input
                  placeholder="Catering, ground transport, special requests"
                  value={form.requirements}
                  onChange={(e) => set("requirements", e.target.value)}
                />
              </FieldWrapper>
            </div>
          </>
        )}

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
            {editing ? <Edit className="size-4" /> : <Plus className="size-4" />}
            {isPending ? "Saving…" : editing ? "Save Changes" : "Add Lead"}
          </Button>
        </div>
      </form>
    </>
  );
}
