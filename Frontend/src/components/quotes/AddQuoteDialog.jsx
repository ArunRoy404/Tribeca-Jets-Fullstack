"use client";

import { useEffect, useMemo, useState } from "react";
import { Edit, Plus, X } from "lucide-react";
import { useQuotesStore } from "@/store/useQuotesStore";
import { useCreateQuote, useUpdateQuote } from "@/hooks/quotes";
import { useClients } from "@/hooks/clients";
import { useAirports } from "@/hooks/airports";
import { useOperators } from "@/hooks/operators";
import { displayName } from "@/lib/client";
import { formatMoney } from "@/lib/lead";
import { usePermissions } from "@/hooks/common/usePermissions";
import { Permission } from "@/lib/permissions";
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
import { Switch } from "@/components/ui/switch";
import FormField from "@/components/trips/FormField";
import PickerSelect from "@/components/trips/PickerSelect";
import DatePicker from "@/components/common/DatePicker";

/**
 * Writes or edits a client quote.
 *
 * **Nothing here defaults a value.** Every field opened pre-filled before this
 * was wired — client "Jonathan Reed", broker "Barry Wilson", route KTEB→KPBI,
 * a Gulfstream G550, a base price of 79,500 and an operator cost of 65,000 —
 * so a broker who filled in only the client sent a quote priced against
 * somebody else's flight. The only value that survives is `fetEnabled`, which
 * is a real API default (domestic legs are taxable) and is a switch the broker
 * can see, not a hidden number.
 *
 * **The summary bar does not calculate anything.** It shows what was typed and
 * says the totals come back from the server. A second copy of the FET and
 * margin arithmetic in JavaScript would disagree with the API the first time a
 * rounding rule changed — and the figure on screen is the one a broker reads
 * down the phone.
 */

const FIELD_CLASS = "h-11 px-3 rounded-md text-[13px] font-medium";
const LABEL_CLASS = "text-[13px] text-foreground mb-1.5";

const EMPTY_FORM = {
  clientId: "",
  assignedBrokerId: "",
  operatorId: "",
  originAirportId: "",
  destinationAirportId: "",
  quotedAircraft: "",
  departureDate: "",
  returnDate: "",
  validUntil: "",
  passengers: "",
  basePrice: "",
  operatorCost: "",
  depositAmount: "",
  fetEnabled: true,
  terms: "",
  internalNotes: "",
  versionNote: "",
};

/** Blank stays blank: an empty number box sends "", and `Number("")` is 0. */
const optionalText = (value) => {
  const trimmed = String(value ?? "").trim();
  return trimmed || undefined;
};
const optionalNumber = (value) => {
  const trimmed = String(value ?? "").trim();
  return trimmed === "" ? undefined : Number(trimmed);
};

export default function AddQuoteDialog() {
  const open = useQuotesStore((s) => s.addModalOpen);
  const editing = useQuotesStore((s) => s.editingQuote);
  const closeModal = useQuotesStore((s) => s.closeAddQuoteModal);

  const { mutate: createQuote, isPending: isCreating } = useCreateQuote();
  const { mutate: updateQuote, isPending: isUpdating } = useUpdateQuote();
  const isPending = isCreating || isUpdating;

  const { canWrite } = usePermissions();
  const seesFinancials = canWrite(Permission.VIEW_FINANCIALS);

  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const setField = (field) => (value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const { data: clients } = useClients({ limit: 100 }, { enabled: open });
  const { data: airports } = useAirports({ limit: 100 }, { enabled: open });
  const { data: operators } = useOperators({ limit: 100 }, { enabled: open });

  const clientOptions = useMemo(
    () => (clients?.data ?? []).map((c) => ({ value: c.id, label: displayName(c) })),
    [clients?.data],
  );
  const airportOptions = useMemo(
    () =>
      (airports?.data ?? []).map((a) => ({
        value: a.id,
        label: `${a.icao} · ${a.city ?? a.name}`,
      })),
    [airports?.data],
  );
  const operatorOptions = useMemo(
    () => (operators?.data ?? []).map((o) => ({ value: o.id, label: o.name })),
    [operators?.data],
  );

  // Prefills from the record being edited and from nothing else. A field the
  // quote does not have opens empty.
  useEffect(() => {
    if (!open) return;
    setFieldErrors({});
    if (!editing) {
      setForm(EMPTY_FORM);
      return;
    }
    setForm({
      clientId: editing.clientId ?? "",
      assignedBrokerId: editing.brokerId ?? "",
      operatorId: editing.operatorId ?? "",
      originAirportId: editing.originAirportId ?? "",
      destinationAirportId: editing.destinationAirportId ?? "",
      quotedAircraft: editing.rawQuotedAircraft ?? "",
      departureDate: editing.rawDepartureDate ?? "",
      returnDate: editing.rawReturnDate ?? "",
      validUntil: editing.rawValidUntil ?? "",
      passengers: editing.passengers === "—" ? "" : (editing.passengers ?? ""),
      basePrice: editing.rawBasePrice ?? "",
      operatorCost: editing.rawOperatorCost ?? "",
      depositAmount: editing.rawDeposit ?? "",
      fetEnabled: editing.fetEnabled ?? true,
      terms: editing.terms ?? "",
      internalNotes: editing.notes ?? "",
      versionNote: "",
    });
  }, [open, editing]);

  const handleClose = () => {
    setForm(EMPTY_FORM);
    setFieldErrors({});
    closeModal();
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // The three things the form promises and the API enforces, said the same
    // way in both places.
    const errors = {};
    if (!form.clientId) errors.clientId = "Choose who this quote is for";
    if (String(form.basePrice).trim() === "") {
      errors.basePrice = "The base price is required";
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    const payload = {
      clientId: form.clientId,
      assignedBrokerId: form.assignedBrokerId || null,
      operatorId: form.operatorId || null,
      originAirportId: form.originAirportId || null,
      destinationAirportId: form.destinationAirportId || null,
      quotedAircraft: optionalText(form.quotedAircraft),
      departureDate: optionalText(form.departureDate),
      returnDate: optionalText(form.returnDate),
      validUntil: optionalText(form.validUntil),
      passengers: optionalNumber(form.passengers),
      basePrice: Number(form.basePrice),
      fetEnabled: form.fetEnabled,
      operatorCost: optionalNumber(form.operatorCost),
      depositAmount: optionalNumber(form.depositAmount),
      terms: optionalText(form.terms),
      internalNotes: optionalText(form.internalNotes),
    };

    if (editing) {
      updateQuote(
        { id: editing.id, ...payload, versionNote: optionalText(form.versionNote) },
        { onSuccess: handleClose },
      );
    } else {
      createQuote(payload, { onSuccess: handleClose });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto p-6 flex flex-col gap-4">
        <DialogHeader className="flex flex-col items-start gap-1 pb-2 border-b border-border">
          <DialogTitle className="font-montserrat font-bold text-[20px] text-foreground">
            {editing ? `Edit ${editing.reference}` : "New Quote"}
          </DialogTitle>
          <DialogDescription className="font-montserrat text-[13px] text-muted-foreground">
            {editing
              ? "A change to the price cuts a new version; anything else leaves the version alone."
              : "Saved as a draft. Nothing reaches the client until you send it."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <FormField
              label="Client"
              labelClassName={LABEL_CLASS}
              error={fieldErrors.clientId}
            >
              <PickerSelect
                value={form.clientId}
                onChange={setField("clientId")}
                options={clientOptions}
                placeholder="Select client"
                className={FIELD_CLASS}
              />
            </FormField>
            <FormField label="Operator (Optional)" labelClassName={LABEL_CLASS}>
              <PickerSelect
                value={form.operatorId}
                onChange={setField("operatorId")}
                options={operatorOptions}
                placeholder="Select operator"
                className={FIELD_CLASS}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <FormField label="Route from (Optional)" labelClassName={LABEL_CLASS}>
              <PickerSelect
                value={form.originAirportId}
                onChange={setField("originAirportId")}
                options={airportOptions}
                placeholder="Select departure airport"
                className={FIELD_CLASS}
              />
            </FormField>
            <FormField label="Route to (Optional)" labelClassName={LABEL_CLASS}>
              <PickerSelect
                value={form.destinationAirportId}
                onChange={setField("destinationAirportId")}
                options={airportOptions}
                placeholder="Select arrival airport"
                className={FIELD_CLASS}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
            <FormField label="Aircraft (Optional)" labelClassName={LABEL_CLASS}>
              <Input
                className={FIELD_CLASS}
                placeholder="e.g. Gulfstream G550"
                value={form.quotedAircraft}
                onChange={(e) => setField("quotedAircraft")(e.target.value)}
              />
            </FormField>
            <FormField label="Departure (Optional)" labelClassName={LABEL_CLASS}>
              <DatePicker
                className={FIELD_CLASS}
                value={form.departureDate}
                onChange={setField("departureDate")}
                placeholder="Choose Date"
              />
            </FormField>
            <FormField label="Return (Optional)" labelClassName={LABEL_CLASS}>
              <DatePicker
                className={FIELD_CLASS}
                value={form.returnDate}
                onChange={setField("returnDate")}
                placeholder="Choose Date"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
            <FormField label="Passengers (Optional)" labelClassName={LABEL_CLASS}>
              <Input
                className={FIELD_CLASS}
                type="number"
                min="1"
                placeholder="e.g. 4"
                value={form.passengers}
                onChange={(e) => setField("passengers")(e.target.value)}
              />
            </FormField>
            <FormField
              label="Base price ($)"
              labelClassName={LABEL_CLASS}
              error={fieldErrors.basePrice}
            >
              <Input
                className={FIELD_CLASS}
                type="number"
                min="0"
                placeholder="e.g. 79500"
                value={form.basePrice}
                onChange={(e) => setField("basePrice")(e.target.value)}
              />
            </FormField>
            <FormField label="Valid until (Optional)" labelClassName={LABEL_CLASS}>
              <DatePicker
                className={FIELD_CLASS}
                value={form.validUntil}
                onChange={setField("validUntil")}
                placeholder="Choose Date"
              />
            </FormField>
          </div>

          {/* The cost side is a financial field. A role without
              VIEW_FINANCIALS never sees the margin on a quote, so offering
              them the box that sets it would be offering a control whose
              result they cannot read. */}
          {seesFinancials && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              <FormField label="Operator cost ($) (Optional)" labelClassName={LABEL_CLASS}>
                <Input
                  className={FIELD_CLASS}
                  type="number"
                  min="0"
                  placeholder="e.g. 65000"
                  value={form.operatorCost}
                  onChange={(e) => setField("operatorCost")(e.target.value)}
                />
              </FormField>
              <FormField label="Deposit ($) (Optional)" labelClassName={LABEL_CLASS}>
                <Input
                  className={FIELD_CLASS}
                  type="number"
                  min="0"
                  placeholder="e.g. 20000"
                  value={form.depositAmount}
                  onChange={(e) => setField("depositAmount")(e.target.value)}
                />
              </FormField>
            </div>
          )}

          {/* Federal Excise Tax. A switch rather than a number, because the
              rate is statutory — the question a broker answers is whether the
              leg is taxable at all, and an international one is not. */}
          <div className="flex items-center justify-between p-3 rounded-md border border-input bg-secondary/20">
            <div className="flex flex-col">
              <span className="font-montserrat font-semibold text-[13px] text-warning">
                Federal Excise Tax
              </span>
              <span className="font-montserrat text-[11px] text-muted-foreground">
                Charged on the base charter price. Turn off for an exempt
                international leg.
              </span>
            </div>
            <Switch
              checked={form.fetEnabled}
              onCheckedChange={setField("fetEnabled")}
              className="data-checked:bg-warning"
            />
          </div>

          <FormField label="Terms (Optional)" labelClassName={LABEL_CLASS}>
            <Textarea
              placeholder="Printed on the quote the client sees."
              value={form.terms}
              onChange={(e) => setField("terms")(e.target.value)}
              className="min-h-20 text-[13px] font-montserrat resize-none"
            />
          </FormField>

          <FormField label="Internal notes (Optional)" labelClassName={LABEL_CLASS}>
            <Textarea
              placeholder="Never shown to the client."
              value={form.internalNotes}
              onChange={(e) => setField("internalNotes")(e.target.value)}
              className="min-h-16 text-[13px] font-montserrat resize-none"
            />
          </FormField>

          {editing && (
            <FormField
              label="What changed (Optional)"
              labelClassName={LABEL_CLASS}
            >
              <Input
                className={FIELD_CLASS}
                placeholder="e.g. Added the return leg"
                value={form.versionNote}
                onChange={(e) => setField("versionNote")(e.target.value)}
              />
            </FormField>
          )}

          {/* What was typed, and nothing derived from it. The FET amount, the
              extras, the total and the margin are computed by the API and come
              back on save — this bar does not guess at them. */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full p-4 rounded-lg bg-secondary/20 border border-border/80 text-center">
            <div className="flex flex-col gap-0.5">
              <span className="font-montserrat text-[11px] font-medium text-muted-foreground tracking-wider uppercase">
                Base
              </span>
              <span className="font-montserrat font-bold text-[16px] text-foreground">
                {form.basePrice === "" ? "—" : formatMoney(Number(form.basePrice))}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="font-montserrat text-[11px] font-medium text-warning tracking-wider uppercase">
                FET
              </span>
              <span className="font-montserrat font-bold text-[16px] text-warning">
                {form.fetEnabled ? "Charged" : "Not charged"}
              </span>
            </div>
            <div className="col-span-2 sm:col-span-1 flex flex-col gap-0.5">
              <span className="font-montserrat text-[11px] font-medium text-success tracking-wider uppercase">
                Total
              </span>
              <span className="font-montserrat text-[12px] text-muted-foreground">
                Calculated on save
              </span>
            </div>
          </div>

          <div className="flex items-center justify-start gap-3 pt-3 border-t border-border/40 w-full">
            <Button
              type="button"
              variant="outline"
              className="h-10 px-4 font-medium text-[13px] gap-1.5"
              onClick={handleClose}
              disabled={isPending}
            >
              <X className="size-3.5" />
              Cancel
            </Button>
            <Button
              type="submit"
              className="h-10 px-5 font-medium text-[13px] gap-1.5 shadow-button"
              disabled={isPending}
            >
              {editing ? <Edit className="size-3.5" /> : <Plus className="size-3.5" />}
              {isPending ? "Saving..." : editing ? "Save Changes" : "Save Draft"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
