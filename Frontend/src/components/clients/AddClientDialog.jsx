"use client";

import { useMemo, useState } from "react";
import { Plus, Edit, X, ArrowRight } from "lucide-react";
import { useClientsStore } from "@/store/useClientsStore";
import { useCreateClient, useUpdateClient } from "@/hooks/clients";
import AirportPicker from "@/components/airports/AirportPicker";
import BrokerPicker from "@/components/users/BrokerPicker";
import CommonSelect from "@/components/common/CommonSelect";
import { usePermissions } from "@/hooks/common/usePermissions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DatePicker from "@/components/common/DatePicker";
import {
  CLIENT_LEAD_SOURCES,
  CLIENT_LEAD_STAGES,
  FILTERABLE_CLIENT_STATUSES,
  FILTERABLE_CLIENT_TYPES,
  formatClientStatus,
  formatClientType,
  formatLeadSource,
  formatLeadStage,
} from "@/lib/client";
import { optionalText } from "@/lib/form";
import { Action, Module } from "@/lib/access";

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

/**
 * Blank. Nothing is pre-filled with a plausible-looking value — the old form
 * opened with "Jonathan Reed", a broker and a lead source already chosen, so a
 * hurried save invented a person.
 */
const EMPTY = {
  firstName: "",
  lastName: "",
  companyName: "",
  email: "",
  phone: "",
  type: "DIRECT",
  status: "LEAD",
  leadStage: "NEW",
  leadSource: "DIRECT",
  assignedBrokerId: "",
  homeAirportId: "",
  birthday: "",
  nextFollowUpAt: "",
  preferredAirports: "",
  routeFrom: "",
  routeTo: "",
  notes: "",
};

/**
 * Splits "KTEB \u2192 KMIA" back into the two controls the form renders it with.
 * Stored as one string because that is how the desk writes a route; the form
 * asks for it as From and To.
 */
function splitRoute(route) {
  const [from = "", to = ""] = String(route ?? "").split("\u2192");
  return { from: from.trim(), to: to.trim() };
}

/** Builds the form state for a client, or a blank form when adding. */
function initialForm(client) {
  if (!client) return EMPTY;
  const prefs = client.preferences ?? {};
  const route = splitRoute((prefs.preferredRoutes ?? [])[0]);
  return {
    ...EMPTY,
    firstName: client.firstName ?? "",
    lastName: client.lastName ?? "",
    companyName: client.companyName ?? "",
    email: client.email === "—" ? "" : (client.email ?? ""),
    phone: client.phone === "—" ? "" : (client.phone ?? ""),
    type: client.rawType ?? "DIRECT",
    status: client.rawStatus ?? "LEAD",
    leadStage: client.rawLeadStage ?? "NEW",
    leadSource: client.rawLeadSource ?? "DIRECT",
    assignedBrokerId: client.assignedBrokerId ?? "",
    homeAirportId: client.homeAirportId ?? "",
    birthday: client.birthday ? client.birthday.slice(0, 10) : "",
    nextFollowUpAt: client.nextFollowUpAt ? client.nextFollowUpAt.slice(0, 10) : "",
    preferredAirports: (prefs.preferredAirports ?? []).join(", "),
    // Repopulated, not dropped: the form is the only editor for these, so a
    // field it reopens blank is a field the next save deletes.
    routeFrom: route.from,
    routeTo: route.to,
    notes: client.notes ?? "",
  };
}

export default function AddClientDialog() {
  const open = useClientsStore((s) => s.addModalOpen);
  const editingClient = useClientsStore((s) => s.editingClient);
  const closeModal = useClientsStore((s) => s.closeAddModal);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeModal()}>
      <DialogContent className="sm:max-w-180 max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-4">
        {/*
          Keyed so the form remounts with fresh state whenever the dialog opens
          on a different client. An effect calling setState renders once with
          the previous client's values before correcting itself.
        */}
        {open && (
          <ClientForm
            key={editingClient?.id ?? "new"}
            editingClient={editingClient}
            onDone={closeModal}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ClientForm({ editingClient, onDone }) {
  const closeModal = onDone;
  const { mutate: createClient, isPending: isCreating } = useCreateClient();
  const { mutate: updateClient, isPending: isUpdating } = useUpdateClient();
  const editing = Boolean(editingClient);
  // Blank is omitted on create and sent as null on edit, so emptying a box
  // actually clears the stored value instead of silently keeping it.
  const optional = (value) => optionalText(value, { editing });

  // Choosing the broker is reassigning the client, which the API allows only
  // to a role holding CLIENTS · ASSIGN. Anyone else is not shown the picker —
  // it could only ever answer 403 — and a broker's own client stays theirs.
  const { canAccess } = usePermissions();
  const mayAssignBroker = canAccess(Module.CLIENTS, Action.ASSIGN);

  const typeOptions = useMemo(
    () =>
      FILTERABLE_CLIENT_TYPES.map((v) => ({
        value: v,
        label: formatClientType(v),
      })),
    [],
  );

  const statusOptions = useMemo(
    () =>
      FILTERABLE_CLIENT_STATUSES.map((v) => ({
        value: v,
        label: formatClientStatus(v),
      })),
    [],
  );

  const leadStageOptions = useMemo(
    () =>
      CLIENT_LEAD_STAGES.map((v) => ({
        value: v,
        label: formatLeadStage(v),
      })),
    [],
  );

  const leadSourceOptions = useMemo(
    () =>
      CLIENT_LEAD_SOURCES.map((v) => ({
        value: v,
        label: formatLeadSource(v),
      })),
    [],
  );

  const [form, setForm] = useState(() => initialForm(editingClient));
  // The keys this form does not render — catering, pets, wifi and the rest of
  // the open set. Carried through untouched so saving the two fields the form
  // does own cannot delete the ones it never showed.
  const untouchedPreferences = useMemo(() => {
    const {
      preferredAirports: _airports,
      preferredRoutes: _routes,
      ...rest
    } = editingClient?.preferences ?? {};
    return rest;
  }, [editingClient]);
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();

    const preferredAirports = form.preferredAirports
      .split(",")
      .map((code) => code.trim().toUpperCase())
      .filter(Boolean);

    const route =
      form.routeFrom && form.routeTo
        ? `${form.routeFrom.trim().toUpperCase()} → ${form.routeTo.trim().toUpperCase()}`
        : null;

    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      companyName: optional(form.companyName),
      email: optional(form.email.toLowerCase()),
      phone: optional(form.phone),
      type: form.type,
      status: form.status,
      leadStage: form.leadStage,
      leadSource: form.leadSource,
      ...(mayAssignBroker ? { assignedBrokerId: optional(form.assignedBrokerId) } : {}),
      homeAirportId: form.homeAirportId || null,
      birthday: optional(form.birthday),
      nextFollowUpAt: form.nextFollowUpAt
        ? new Date(`${form.nextFollowUpAt}T00:00`).toISOString()
        : null,
      notes: optional(form.notes),
      preferences: {
        ...untouchedPreferences,
        ...(preferredAirports.length ? { preferredAirports } : {}),
        ...(route ? { preferredRoutes: [route] } : {}),
      },
    };

    if (editing) {
      updateClient({ id: editingClient.id, ...payload }, { onSuccess: closeModal });
    } else {
      createClient(payload, { onSuccess: closeModal });
    }
  };

  const isAgency = form.type === "TRAVEL_AGENT";

  return (
    <>
        <DialogHeader className="flex flex-col items-start gap-1 pb-2 border-b border-border">
          <DialogTitle className="font-montserrat font-bold text-[20px] text-foreground">
            {editing ? "Edit Client Profile" : "Add New Client"}
          </DialogTitle>
          <DialogDescription className="font-montserrat text-[13px] text-muted-foreground">
            {editing
              ? "Update client profile details in CRM database."
              : "Create a client record in the CRM database."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
          <SectionHeader title="Contact Information" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <FieldWrapper label="First Name">
              <Input
                placeholder="Jonathan"
                value={form.firstName}
                onChange={(e) => set("firstName", e.target.value)}
                className="h-10 text-[13px] font-montserrat"
                required
              />
            </FieldWrapper>

            <FieldWrapper label="Last Name">
              <Input
                placeholder="Reed"
                value={form.lastName}
                onChange={(e) => set("lastName", e.target.value)}
                className="h-10 text-[13px] font-montserrat"
                required
              />
            </FieldWrapper>
          </div>

          {/* Required only for a travel agent, which is the rule the API enforces. */}
          <FieldWrapper label="Company / Organization" optional={!isAgency}>
            <Input
              placeholder="e.g. Sterling Group"
              value={form.companyName}
              onChange={(e) => set("companyName", e.target.value)}
              className="h-10 text-[13px] font-montserrat"
              required={isAgency}
            />
          </FieldWrapper>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <FieldWrapper label="Email" optional>
              <Input
                type="email"
                placeholder="client@example.com"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className="h-10 text-[13px] font-montserrat"
              />
            </FieldWrapper>

            <FieldWrapper label="Phone" optional>
              <Input
                placeholder="+1 (212) 555-0100"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                className="h-10 text-[13px] font-montserrat"
              />
            </FieldWrapper>
          </div>

          <SectionHeader title="Client Profile" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <FieldWrapper label="Client Type">
              <CommonSelect
                value={form.type}
                onChange={(val) => set("type", val)}
                options={typeOptions}
              />
            </FieldWrapper>

            <FieldWrapper label="Status">
              <CommonSelect
                value={form.status}
                onChange={(val) => set("status", val)}
                options={statusOptions}
              />
            </FieldWrapper>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            {/* Where the relationship stands vs where the deal stands — two
                separate things, so two separate controls. */}
            <FieldWrapper label="Lead Stage">
              <CommonSelect
                value={form.leadStage}
                onChange={(val) => set("leadStage", val)}
                options={leadStageOptions}
              />
            </FieldWrapper>

            <FieldWrapper label="Lead Source">
              <CommonSelect
                value={form.leadSource}
                onChange={(val) => set("leadSource", val)}
                options={leadSourceOptions}
              />
            </FieldWrapper>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            {mayAssignBroker && (
              <FieldWrapper label="Assigned Broker" optional>
                <BrokerPicker
                  value={form.assignedBrokerId}
                  onChange={(val) => set("assignedBrokerId", val || "")}
                  placeholder="Unassigned"
                />
              </FieldWrapper>
            )}

            <FieldWrapper label="Follow-up Date" optional>
              <DatePicker
                value={form.nextFollowUpAt}
                onChange={(v) => set("nextFollowUpAt", v)}
                placeholder="Choose Date"
              />
            </FieldWrapper>
          </div>

          <SectionHeader title="Travel Preferences" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            {/* Real airport record picker: live search, server paged */}
            <FieldWrapper label="Home Airport" optional>
              <AirportPicker
                value={form.homeAirportId}
                onChange={(value) => set("homeAirportId", value || "")}
                placeholder="None"
              />
            </FieldWrapper>

            <FieldWrapper label="Birthday" optional>
              <DatePicker
                value={form.birthday}
                onChange={(v) => set("birthday", v)}
                placeholder="Choose Date"
              />
            </FieldWrapper>
          </div>

          <FieldWrapper label="Preferred Airports (comma-separated ICAO codes)" optional>
            <Input
              placeholder="e.g. KTEB, KMIA, KJFK"
              value={form.preferredAirports}
              onChange={(e) => set("preferredAirports", e.target.value)}
              className="h-10 text-[13px] font-montserrat"
            />
          </FieldWrapper>

          <FieldWrapper label="Preferred Route" optional>
            <div className="flex items-center gap-2 w-full">
              <Input
                placeholder="e.g. KTEB"
                value={form.routeFrom}
                onChange={(e) => set("routeFrom", e.target.value)}
                className="h-10 text-[13px] font-montserrat flex-1"
              />
              <ArrowRight className="size-4 text-muted-foreground shrink-0" />
              <Input
                placeholder="e.g. KPBI"
                value={form.routeTo}
                onChange={(e) => set("routeTo", e.target.value)}
                className="h-10 text-[13px] font-montserrat flex-1"
              />
            </div>
          </FieldWrapper>

          <FieldWrapper label="Internal Notes" optional>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Internal notes visible to brokers only..."
              className="w-full p-2.5 rounded-md border border-input bg-background font-montserrat text-[13px] text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-purple resize-none"
            />
          </FieldWrapper>

          {/* The attachment drop zone that used to sit here did nothing at all.
              Client documents belong to the Document Vault module, which owns
              upload, permissions and retention. */}

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
              disabled={isCreating || isUpdating}
              className="bg-[#252832] hover:bg-[#252832]/90 text-white h-9 px-4 font-medium text-[13px] gap-1.5"
            >
              {editing ? <Edit className="size-3.5" /> : <Plus className="size-3.5" />}
              {editing ? "Save Client" : "Add Client"}
            </Button>
          </div>
        </form>
    </>
  );
}
