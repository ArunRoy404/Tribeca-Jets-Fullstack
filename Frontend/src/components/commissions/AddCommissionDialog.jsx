"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import CommonInput from "@/components/common/CommonInput";
import CommonSelect from "@/components/common/CommonSelect";
import DatePicker from "@/components/common/DatePicker";
import FormField from "@/components/trips/FormField";
import FilterTabs from "@/components/table/common/FilterTabs";
import TripPicker from "@/components/trips/TripPicker";
import ClientPicker from "@/components/clients/ClientPicker";
import BrokerPicker from "@/components/users/BrokerPicker";
import ReferralAgentPicker from "@/components/users/ReferralAgentPicker";
import { useCreateCommission, useUpdateCommission } from "@/hooks/commissions";
import { useUser } from "@/hooks/users";
import {
  COMMISSION_BASES,
  COMMISSION_METHODS,
  COMMISSION_STATUSES,
  formatCommissionBasis,
  formatCommissionMethod,
  formatCommissionStatus,
  formatStructure,
} from "@/lib/commission";
import { optionalNumber, optionalText } from "@/lib/form";
import { toDateInput } from "@/lib/date";
import { useCommissionsStore } from "@/store/useCommissionsStore";

const NONE = "__none__";
/** The recipient toggle: a label per wire value. */
const RECIPIENTS = { REFERRAL_AGENT: "Referral Agent", CLIENT: "CRM Client", MANUAL: "Manual Recipient" };
const RECIPIENT_BY_LABEL = Object.fromEntries(Object.entries(RECIPIENTS).map(([value, label]) => [label, value]));
/** For a referral agent the basis may be left to their standing structure. */
const AGENT_DEFAULT = "__agent__";

const options = (values, format) => values.map((value) => ({ value, label: format(value) }));

function initialForm(commission, draft) {
  return {
    tripId: commission?.tripId ?? draft?.tripId ?? "",
    recipientType: commission?.recipientType ?? draft?.recipientType ?? "REFERRAL_AGENT",
    recipientUserId: commission?.recipientUserId ?? "",
    recipientClientId: commission?.recipientClientId ?? "",
    recipientName: commission?.recipientName ?? "",
    recipientCompany: commission?.recipientCompany ?? "",
    brokerId: commission?.brokerId ?? "",
    basis: commission?.basis ?? (commission ? "FLAT_FEE" : AGENT_DEFAULT),
    percentage: commission?.percentage ?? "",
    amount: commission?.amount ?? "",
    finalAmount: commission?.finalAmount ?? "",
    status: commission?.status ?? "PENDING",
    method: commission?.method ?? "",
    paidAt: toDateInput(commission?.paidAt),
    notes: commission?.notes ?? "",
  };
}

/**
 * Raise or edit a commission on a trip — to a referral agent, a CRM client
 * (a travel agent), or anyone else by name.
 *
 * Uses shared pickers (TripPicker, ReferralAgentPicker, ClientPicker, BrokerPicker)
 * powered by RecordPicker to handle 1,000+ records via server pagination and search.
 */
export default function AddCommissionDialog() {
  const open = useCommissionsStore((s) => s.addModalOpen);
  const editing = useCommissionsStore((s) => s.editingCommission);
  const draft = useCommissionsStore((s) => s.draft);
  const close = useCommissionsStore((s) => s.closeAddModal);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent className="sm:max-w-3xl rounded-2xl p-6 gap-4 max-h-[90vh] overflow-y-auto">
        {open && <CommissionForm key={editing?.id ?? "new"} commission={editing} draft={draft} onDone={close} />}
      </DialogContent>
    </Dialog>
  );
}

function CommissionForm({ commission, draft, onDone }) {
  const editing = Boolean(commission);
  const [form, setForm] = useState(() => initialForm(commission, draft));
  const [errors, setErrors] = useState({});
  const set = (field) => (value) => setForm((prev) => ({ ...prev, [field]: value }));

  // When a referral agent is picked, fetch their standing commission structure
  const { data: agent } = useUser(form.recipientType === "REFERRAL_AGENT" && form.recipientUserId ? form.recipientUserId : null);
  const agentTerms = agent?.commissionBasis ? formatStructure(agent) : null;

  const basisOptions = useMemo(() => [
    ...(form.recipientType === "REFERRAL_AGENT"
      ? [{ value: AGENT_DEFAULT, label: agentTerms ? `Agent's standard (${agentTerms})` : "Agent's standard structure" }]
      : []),
    ...options(COMMISSION_BASES, formatCommissionBasis),
  ], [form.recipientType, agentTerms]);

  const basis = form.recipientType !== "REFERRAL_AGENT" && form.basis === AGENT_DEFAULT ? "" : form.basis;

  const { mutate: create, isPending: creating } = useCreateCommission();
  const { mutate: update, isPending: updating } = useUpdateCommission();

  const handleSubmit = (event) => {
    event.preventDefault();
    const next = {};
    if (!form.tripId) next.tripId = "Choose the trip";
    if (form.recipientType === "REFERRAL_AGENT" && !form.recipientUserId) next.recipientUserId = "Choose the referral agent";
    if (form.recipientType === "CLIENT" && !form.recipientClientId) next.recipientClientId = "Choose the client";
    if (form.recipientType === "MANUAL" && !form.recipientName.trim()) next.recipientName = "Name who is being paid";
    if (!basis) next.basis = "Choose how it is worked out";
    if (basis === "PERCENT_OF_PROFIT" && !String(form.percentage).trim()) next.percentage = "Enter the percentage";
    if ((basis === "FLAT_FEE" || basis === "CUSTOM") && !String(form.amount).trim()) next.amount = "Enter the amount";
    setErrors(next);
    if (Object.keys(next).length) return;

    const clear = { editing };
    const useAgentTerms = basis === AGENT_DEFAULT;
    const payload = {
      tripId: form.tripId,
      recipientType: form.recipientType,
      ...(form.recipientType === "REFERRAL_AGENT" ? { recipientUserId: form.recipientUserId } : {}),
      ...(form.recipientType === "CLIENT" ? { recipientClientId: form.recipientClientId } : {}),
      ...(form.recipientType === "MANUAL"
        ? { recipientName: form.recipientName.trim(), recipientCompany: optionalText(form.recipientCompany, clear) }
        : {}),
      ...(form.brokerId ? { brokerId: form.brokerId } : editing ? { brokerId: null } : {}),
      ...(useAgentTerms
        ? {}
        : {
            basis,
            ...(basis === "PERCENT_OF_PROFIT"
              ? { percentage: optionalNumber(form.percentage) }
              : { amount: optionalNumber(form.amount) }),
          }),
      finalAmount: optionalNumber(form.finalAmount, clear),
      status: form.status,
      method: form.method && form.method !== NONE ? form.method : editing ? null : undefined,
      paidAt: form.status === "PAID" && form.paidAt ? form.paidAt : undefined,
      notes: optionalText(form.notes, clear),
    };

    const onError = (error) => setErrors(error?.fieldErrors ?? {});
    if (editing) update({ id: commission.id, ...payload }, { onSuccess: onDone, onError });
    else create(payload, { onSuccess: onDone, onError });
  };

  return (
    <>
      <div className="border-b border-secondary pb-4 w-full">
        <DialogTitle className="font-montserrat font-bold text-[20px] text-foreground leading-none">
          {editing ? "Edit Commission" : "Add Commission"}
        </DialogTitle>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
        <FormField label="Trip" error={errors.tripId}>
          <TripPicker
            value={form.tripId}
            onChange={set("tripId")}
            invalid={Boolean(errors.tripId)}
            placeholder="Choose the trip"
          />
        </FormField>

        <FormField label="Paid to" error={errors.recipientType}>
          <FilterTabs
            options={Object.values(RECIPIENTS)}
            value={RECIPIENTS[form.recipientType]}
            onValueChange={(label) => {
              const type = RECIPIENT_BY_LABEL[label] ?? "REFERRAL_AGENT";
              setForm((prev) => ({
                ...prev,
                recipientType: type,
                basis: type === "REFERRAL_AGENT" ? AGENT_DEFAULT : prev.basis === AGENT_DEFAULT ? "FLAT_FEE" : prev.basis,
              }));
            }}
          />
        </FormField>

        {form.recipientType === "REFERRAL_AGENT" && (
          <FormField label="Referral agent" error={errors.recipientUserId}>
            <ReferralAgentPicker
              value={form.recipientUserId}
              onChange={set("recipientUserId")}
              invalid={Boolean(errors.recipientUserId)}
              placeholder="Choose the referral agent"
            />
          </FormField>
        )}
        {form.recipientType === "CLIENT" && (
          <FormField label="Client" error={errors.recipientClientId}>
            <ClientPicker
              value={form.recipientClientId}
              onChange={set("recipientClientId")}
              invalid={Boolean(errors.recipientClientId)}
              placeholder="Choose the client"
            />
          </FormField>
        )}
        {form.recipientType === "MANUAL" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <FormField label="Recipient name" error={errors.recipientName}>
              <CommonInput value={form.recipientName} onChange={(e) => set("recipientName")(e.target.value)} placeholder="Who is paid" />
            </FormField>
            <FormField label="Company (Optional)" error={errors.recipientCompany}>
              <CommonInput value={form.recipientCompany} onChange={(e) => set("recipientCompany")(e.target.value)} placeholder="Their company" />
            </FormField>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          <FormField label="Worked out as" error={errors.basis}>
            <CommonSelect value={basis} onChange={set("basis")} options={basisOptions} placeholder="Choose the structure" />
          </FormField>
          {basis === "PERCENT_OF_PROFIT" && (
            <FormField label="Percentage of Tribeca profit" error={errors.percentage}>
              <CommonInput type="number" min="0.01" max="100" step="0.01" value={form.percentage} onChange={(e) => set("percentage")(e.target.value)} placeholder="e.g. 10" />
            </FormField>
          )}
          {(basis === "FLAT_FEE" || basis === "CUSTOM") && (
            <FormField label="Amount, USD" error={errors.amount}>
              <CommonInput type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => set("amount")(e.target.value)} placeholder="e.g. 1500" />
            </FormField>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
          <FormField label="Final amount (Optional)" error={errors.finalAmount}>
            <CommonInput type="number" min="0.01" step="0.01" value={form.finalAmount} onChange={(e) => set("finalAmount")(e.target.value)} placeholder="Once settled" />
          </FormField>
          <FormField label="Status" error={errors.status}>
            <CommonSelect value={form.status} onChange={set("status")} options={options(COMMISSION_STATUSES, formatCommissionStatus)} />
          </FormField>
          <FormField label="Broker (Optional)" error={errors.brokerId}>
            <BrokerPicker
              value={form.brokerId}
              onChange={(id) => set("brokerId")(id || "")}
              allowClear
              clearLabel="The trip's broker"
              placeholder="The trip's broker"
            />
          </FormField>
        </div>

        {form.status === "PAID" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <FormField label="Paid on (Optional — today if blank)" error={errors.paidAt}>
              <DatePicker value={form.paidAt} onChange={set("paidAt")} placeholder="Today" />
            </FormField>
            <FormField label="Method (Optional)" error={errors.method}>
              <CommonSelect
                value={form.method || NONE}
                onChange={set("method")}
                options={[{ value: NONE, label: "Not recorded" }, ...options(COMMISSION_METHODS, formatCommissionMethod)]}
              />
            </FormField>
          </div>
        )}

        <FormField label="Notes (Optional)" error={errors.notes}>
          <CommonInput type="textarea" rows={3} value={form.notes} onChange={(e) => set("notes")(e.target.value)} placeholder="Desk notes. Never shown to the payee." />
        </FormField>

        <div className="border-t border-secondary flex gap-2 justify-end items-center pt-4 w-full">
          <Button type="button" variant="outline" className="gap-2 px-4" onClick={onDone}>
            <X className="size-4" />
            Cancel
          </Button>
          <Button type="submit" disabled={creating || updating} className="gap-2 px-4">
            {editing ? <Pencil className="size-4" /> : <Plus className="size-4" />}
            {editing ? "Save Changes" : "Add Commission"}
          </Button>
        </div>
      </form>
    </>
  );
}
