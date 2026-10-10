"use client";

import { useEffect, useMemo, useState } from "react";
import { Edit, Plus, Trash2, X } from "lucide-react";
import { useQuotesStore } from "@/store/useQuotesStore";
import {
  useCreateQuote,
  useUpdateQuote,
  useQuotePricePreview,
} from "@/hooks/quotes";
import { useTripRequests } from "@/hooks/trip-requests";
import { useClient } from "@/hooks/clients";
import { useAirport } from "@/hooks/airports";
import { useOperator } from "@/hooks/operators";
import { useAircraft } from "@/hooks/aircraft";
import { useUser } from "@/hooks/users";
import { displayName } from "@/lib/client";
import {
  formatMoney,
  personName,
} from "@/lib/lead";
import { formatDate } from "@/lib/archive";
import {
  DEFAULT_FET_RATE,
  formatFetRate,
  formatMargin,
  formatQuoteStatus,
  toLineItemRow,
} from "@/lib/quote";
import { usePermissions } from "@/hooks/common/usePermissions";
import { Module, Action } from "@/lib/access";
import { uploadUrl, passthroughImageLoader } from "@/services/uploads.service";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import FormField from "@/components/trips/FormField";
import CommonSelect from "@/components/common/CommonSelect";
import ClientPicker from "@/components/clients/ClientPicker";
import BrokerPicker from "@/components/users/BrokerPicker";
import AirportPicker from "@/components/airports/AirportPicker";
import OperatorPicker from "@/components/operators/OperatorPicker";
import AircraftPicker from "@/components/aircraft/AircraftPicker";
import DatePicker from "@/components/common/DatePicker";
import DetailTabNav from "@/components/common/DetailTabNav";
import TribecaLetterhead from "@/components/common/TribecaLetterhead";
import FileUpload, { ACCEPT } from "@/components/common/FileUpload";
import { PhotoTile } from "@/components/common/photo-tile";
import SuggestedPricePicker from "@/components/quotes/pricing/SuggestedPricePicker";
import QuoteDetailStats from "@/components/quotes/header/QuoteDetailStats";
import QuoteBreakdownCard from "@/components/quotes/breakdown/QuoteBreakdownCard";
import FlightDetailsCard from "@/components/quotes/flight/FlightDetailsCard";
import QuoteProfitabilityCard from "@/components/quotes/profitability/QuoteProfitabilityCard";
import QuoteVersionsCard from "@/components/quotes/versions/QuoteVersionsCard";
import QuoteStatusActionsCard from "@/components/quotes/actions/QuoteStatusActionsCard";
import QuoteNotesCard from "@/components/quotes/notes/QuoteNotesCard";
import { cn } from "@/lib/utils";
import { optionalNumber, optionalText } from "@/lib/form";

/**
 * Writes or edits a client quote, full-screen with a live document preview —
 * the same split-pane pattern `BuildItineraryDialog` uses: the form on the
 * left, and on the right the quote exactly as it will read once saved,
 * updating on every keystroke.
 *
 * **The live BASE/FET/TOTAL/MARGIN figures come from the server, never from
 * arithmetic re-implemented here.** `useQuotePricePreview` calls
 * `POST /quotes/price-preview` — a dry run of the exact same `priceQuote()`
 * function a saved quote uses — debounced as the priced fields change. A
 * second copy of the FET and margin math in JavaScript would disagree with
 * the API the first time a rounding rule changed, and that is true of a
 * preview exactly as much as it is true of a saved row.
 *
 * **Nothing here defaults a value.** Every field opens blank; only
 * `fetEnabled` survives from `EMPTY_FORM`, because it is a real API default
 * (domestic legs are taxable) shown as a switch the broker can see, not a
 * hidden number.
 *
 * The right pane reuses the same cards `QuoteDetailsView` renders for a saved
 * quote (`QuoteBreakdownCard`, `FlightDetailsCard`, `QuoteProfitabilityCard`,
 * `QuoteNotesCard`) fed a locally-built row shaped like `toQuoteRow()`'s
 * output, so the preview is not a second, drifting copy of that markup.
 * `QuoteVersionsCard` and `QuoteStatusActionsCard` only make sense against a
 * quote that actually exists — a version history and Send/Approve buttons for
 * a row with no id yet — so they render only while editing a saved quote, fed
 * the real `editing` record (already shaped this way by the table).
 */

const FIELD_CLASS = "h-11 px-3 rounded-md text-[13px] font-medium";
const LABEL_CLASS = "text-[13px] text-foreground mb-1.5";
const READ_ONLY_CLASS =
  "h-11 px-3 rounded-md text-[13px] font-medium flex items-center bg-secondary/40 text-muted-foreground border border-input";

const TABS = [
  { id: "form", label: "Form" },
  { id: "preview", label: "Preview" },
];

const EMPTY_FORM = {
  clientId: "",
  tripRequestId: "",
  assignedBrokerId: "",
  operatorId: "",
  originAirportId: "",
  destinationAirportId: "",
  aircraftId: "",
  quotedAircraft: "",
  exteriorImageUrl: "",
  departureDate: "",
  returnDate: "",
  validUntil: "",
  passengers: "",
  basePrice: "",
  operatorCost: "",
  depositAmount: "",
  fetEnabled: true,
  lineItems: [],
  terms: "",
  internalNotes: "",
  versionNote: "",
};


let lineItemSeq = 0;
const newLineItem = () => ({ key: `li-${++lineItemSeq}`, label: "", amount: "", included: false });

export default function AddQuoteDialog() {
  const open = useQuotesStore((s) => s.addModalOpen);
  const editing = useQuotesStore((s) => s.editingQuote);
  const draft = useQuotesStore((s) => s.draftQuote);
  const closeModal = useQuotesStore((s) => s.closeAddQuoteModal);

  const [activeTab, setActiveTab] = useState("form");

  const { mutate: createQuote, isPending: isCreating } = useCreateQuote();
  const { mutate: updateQuote, isPending: isUpdating } = useUpdateQuote();
  const isPending = isCreating || isUpdating;

  const { canAccess } = usePermissions();
  const seesFinancials = canAccess(Module.QUOTES, Action.VIEW_MONEY);

  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const setField = (field) => (value) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // Load open requests to allow quick linking and pre-filling
  const { data: openRequestsData } = useTripRequests(
    { openOnly: true, limit: 100 },
    { enabled: Boolean(open && !editing) },
  );

  const linkedTripOptions = useMemo(() => {
    const list = openRequestsData?.data ?? [];
    return [
      { value: "", label: "Standalone quote (No linked enquiry)" },
      ...list.map((r) => ({
        value: r.id,
        label: `TR-${r.reference} · ${r.client?.companyName || personName(r.client) || "Client"} · ${r.originAirport?.icao || "—"} → ${r.destinationAirport?.icao || "—"}`,
      })),
    ];
  }, [openRequestsData?.data]);

  const handleLinkedTripChange = (tripId) => {
    setField("tripRequestId")(tripId);
    if (!tripId) return;
    const found = openRequestsData?.data?.find((r) => r.id === tripId);
    if (!found) return;

    setForm((prev) => ({
      ...prev,
      tripRequestId: tripId,
      clientId: found.clientId || prev.clientId,
      assignedBrokerId: found.assignedBrokerId || prev.assignedBrokerId,
      originAirportId: found.originAirportId || prev.originAirportId,
      destinationAirportId: found.destinationAirportId || prev.destinationAirportId,
      departureDate: found.departureDate ? found.departureDate.slice(0, 10) : prev.departureDate,
      returnDate: found.returnDate ? found.returnDate.slice(0, 10) : prev.returnDate,
      passengers: found.passengers != null ? String(found.passengers) : prev.passengers,
      terms: found.requirements || prev.terms,
      internalNotes: found.internalNotes || prev.internalNotes,
    }));

    setFieldErrors((prev) => {
      const next = { ...prev };
      if (found.clientId) delete next.clientId;
      if (found.originAirportId) delete next.originAirportId;
      if (found.destinationAirportId) delete next.destinationAirportId;
      if (found.departureDate) delete next.departureDate;
      return next;
    });
  };

  const handleClientChange = (clientId, rawClient) => {
    setField("clientId")(clientId || "");
    if (rawClient) {
      setForm((prev) => ({
        ...prev,
        clientId: clientId || "",
        ...(!prev.assignedBrokerId || !editing
          ? rawClient.assignedBrokerId
            ? { assignedBrokerId: rawClient.assignedBrokerId }
            : {}
          : {}),
        ...(!prev.originAirportId || !editing
          ? rawClient.homeAirportId
            ? { originAirportId: rawClient.homeAirportId }
            : {}
          : {}),
      }));
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.clientId;
        if (rawClient.homeAirportId) delete next.originAirportId;
        return next;
      });
    }
  };

  const { data: selectedClient } = useClient(form.clientId, {
    enabled: Boolean(open && form.clientId),
  });

  // When selected client details resolve via network, sync broker and home airport during render if still empty
  const [syncedClientId, setSyncedClientId] = useState(null);
  if (!editing && form.clientId && selectedClient && syncedClientId !== form.clientId) {
    setSyncedClientId(form.clientId);
    const updates = {};
    if (!form.assignedBrokerId && selectedClient.assignedBrokerId) {
      updates.assignedBrokerId = selectedClient.assignedBrokerId;
    }
    if (!form.originAirportId && selectedClient.homeAirportId) {
      updates.originAirportId = selectedClient.homeAirportId;
    }
    if (Object.keys(updates).length) {
      setForm((prev) => ({ ...prev, ...updates }));
    }
  }

  const { data: selectedBroker } = useUser(form.assignedBrokerId, {
    enabled: Boolean(open && form.assignedBrokerId),
  });
  const { data: selectedOriginAirport } = useAirport(form.originAirportId, {
    enabled: Boolean(open && form.originAirportId),
  });
  const { data: selectedDestinationAirport } = useAirport(form.destinationAirportId, {
    enabled: Boolean(open && form.destinationAirportId),
  });
  const { data: selectedOperator } = useOperator(form.operatorId, {
    enabled: Boolean(open && form.operatorId),
  });
  const { data: selectedAircraft } = useAircraft(form.aircraftId, {
    enabled: Boolean(open && form.aircraftId),
  });

  /**
   * Prefills from the record being edited and from nothing else. A field the
   * quote does not have opens empty.
   *
   * Adjusted during render rather than in an effect — React's documented
   * pattern for "reset state when a prop changes" (see `useImageZoomPan.js`
   * for the same shape). An effect would commit the previous record's fields
   * for one frame before resetting on the next tick; comparing a tracked key
   * during render resets in the same commit the dialog opens or switches
   * records in.
   */
  const formResetKey = open ? (editing?.id ?? "new") : null;
  const [trackedFormResetKey, setTrackedFormResetKey] = useState(formResetKey);
  if (trackedFormResetKey !== formResetKey) {
    setTrackedFormResetKey(formResetKey);
    setFieldErrors({});
    setActiveTab("form");
    setForm(
      !editing
        ? // A new quote starts empty, or from what the instant estimate
          // handed over — only fields the estimate actually knows.
          { ...EMPTY_FORM, ...(draft ?? {}) }
        : {
            clientId: editing.clientId ?? "",
            tripRequestId: editing.tripRequestId ?? "",
            assignedBrokerId: editing.brokerId ?? "",
            operatorId: editing.operatorId ?? "",
            originAirportId: editing.originAirportId ?? "",
            destinationAirportId: editing.destinationAirportId ?? "",
            aircraftId: editing.aircraftId ?? "",
            quotedAircraft: editing.rawQuotedAircraft ?? "",
            exteriorImageUrl: editing.exteriorImageUrl ?? "",
            departureDate: editing.rawDepartureDate ?? "",
            returnDate: editing.rawReturnDate ?? "",
            validUntil: editing.rawValidUntil ?? "",
            passengers: editing.passengers === "—" ? "" : (editing.passengers ?? ""),
            basePrice: editing.rawBasePrice ?? "",
            operatorCost: editing.rawOperatorCost ?? "",
            depositAmount: editing.rawDeposit ?? "",
            fetEnabled: editing.fetEnabled ?? true,
            lineItems: (editing.lineItems ?? []).map((li) => ({
              key: `li-${++lineItemSeq}`,
              label: li.label === "—" ? "" : (li.label ?? ""),
              amount: li.rawAmount ?? "",
              included: li.type === "text",
            })),
            terms: editing.terms ?? "",
            internalNotes: editing.notes ?? "",
            versionNote: "",
          },
    );
  }

  const handleClose = () => {
    setForm(EMPTY_FORM);
    setFieldErrors({});
    closeModal();
  };

  // ---- Line items -----------------------------------------------------------
  const addLineItem = () => setForm((prev) => ({ ...prev, lineItems: [...prev.lineItems, newLineItem()] }));
  const removeLineItem = (key) =>
    setForm((prev) => ({ ...prev, lineItems: prev.lineItems.filter((li) => li.key !== key) }));
  const updateLineItem = (key, field, value) =>
    setForm((prev) => ({
      ...prev,
      lineItems: prev.lineItems.map((li) => (li.key === key ? { ...li, [field]: value } : li)),
    }));

  // ---- Live pricing preview ---------------------------------------------------
  // Debounced dry run against the server's own pricing engine — see the
  // module doc comment for why this never runs the arithmetic itself.
  const { mutate: fetchPricePreview } = useQuotePricePreview();
  const [pricePreview, setPricePreview] = useState(null);

  const validLineItemsForPreview = useMemo(
    () =>
      form.lineItems
        .filter((li) => li.label.trim() && (li.included || optionalNumber(li.amount) !== undefined))
        .map((li) => ({
          label: li.label.trim(),
          amount: li.included ? null : optionalNumber(li.amount) ?? null,
          included: li.included,
        })),
    [form.lineItems],
  );

  const trimmedBase = String(form.basePrice ?? "").trim();
  const hasValidBase = trimmedBase !== "" && !Number.isNaN(Number(trimmedBase));
  // `pricePreview` can hold a stale response from before the base price was
  // cleared — this is what hides it again without a synchronous setState in
  // the effect below, which oxlint's react-hooks/set-state-in-effect rule
  // (correctly) flags: clearing derived state belongs in the render it
  // affects, not as a side effect of an unrelated field changing.
  const effectivePricePreview = hasValidBase ? pricePreview : null;

  const editingFetRate =
    editing?.fetRate === null || editing?.fetRate === undefined ? null : Number(editing.fetRate);
  // The rate the label shows: the server's own answer once it has priced,
  // else the edited quote's rate, else the default a new quote is saved with.
  const fetRateShown = effectivePricePreview?.fetRate ?? editingFetRate ?? DEFAULT_FET_RATE;

  useEffect(() => {
    if (!hasValidBase) return undefined;
    const handle = setTimeout(() => {
      fetchPricePreview(
        {
          basePrice: Number(trimmedBase),
          fetEnabled: form.fetEnabled,
          // An edited quote keeps the rate it was saved with; the preview
          // must price at that rate, not the default a new quote gets.
          ...(editingFetRate !== null ? { fetRate: editingFetRate } : {}),
          operatorCost: optionalNumber(form.operatorCost),
          lineItems: validLineItemsForPreview,
        },
        {
          onSuccess: (data) => setPricePreview(data),
          onError: () => setPricePreview(null),
        },
      );
    }, 400);
    return () => clearTimeout(handle);
  }, [hasValidBase, trimmedBase, form.fetEnabled, editingFetRate, form.operatorCost, validLineItemsForPreview, fetchPricePreview]);

  // ---- The live preview document ---------------------------------------------
  // Shaped like `lib/quote.js`'s `toQuoteRow()` so the reused cards below read
  // it exactly as they read a saved quote — see the module doc comment.
  // The picked tail's own fleet photos, offered first in the photo library —
  // the photo a broker wants on a quote is usually the one already on file
  // for that aircraft.
  const fleetPhotos = [
    { url: selectedAircraft?.exteriorImageUrl, label: `${selectedAircraft?.tailNumber ?? ""} exterior`.trim() },
    { url: selectedAircraft?.interiorImageUrl, label: `${selectedAircraft?.tailNumber ?? ""} interior`.trim() },
  ].filter((photo) => photo.url);

  const previewLineItems = useMemo(
    () =>
      validLineItemsForPreview.map((item) =>
        toLineItemRow({ label: item.label, amount: item.included ? null : item.amount, included: item.included }),
      ),
    [validLineItemsForPreview],
  );

  const previewQuote = useMemo(() => {
    const depositValue = optionalNumber(form.depositAmount);
    const operatorCostValue = optionalNumber(form.operatorCost);

    return {
      id: editing?.id,
      reference: editing ? editing.reference : "Draft — reference assigned on save",

      client: selectedClient ? displayName(selectedClient) : "—",
      broker: selectedBroker ? personName(selectedBroker) : "Unassigned",

      origin: selectedOriginAirport?.icao ?? "—",
      destination: selectedDestinationAirport?.icao ?? "—",
      departure: form.departureDate ? formatDate(form.departureDate) : "—",
      rawReturnDate: form.returnDate || null,
      returnDate: form.returnDate ? formatDate(form.returnDate) : "—",

      aircraft: selectedAircraft
        ? [selectedAircraft.model, selectedAircraft.tailNumber].filter(Boolean).join(" · ")
        : form.quotedAircraft || "—",
      operator: selectedOperator?.name ?? "—",
      passengers: optionalNumber(form.passengers) ?? "—",
      tripRequestId: null,
      sourcedFrom: null,

      basePrice: hasValidBase ? formatMoney(Number(trimmedBase)) : "—",
      fetEnabled: form.fetEnabled,
      fetRateLabel: formatFetRate(fetRateShown),
      fet: !form.fetEnabled ? "Not charged" : effectivePricePreview ? formatMoney(effectivePricePreview.fetAmount) : "—",
      lineItems: previewLineItems,
      total: effectivePricePreview ? formatMoney(effectivePricePreview.totalPrice) : "—",
      rawDeposit: depositValue ?? null,
      deposit: depositValue != null ? formatMoney(depositValue) : "—",

      hasFinancials: seesFinancials,
      rawOperatorCost: operatorCostValue ?? null,
      operatorCost: seesFinancials ? (operatorCostValue != null ? formatMoney(operatorCostValue) : "—") : "—",
      grossProfit:
        seesFinancials && effectivePricePreview?.grossProfit != null
          ? formatMoney(effectivePricePreview.grossProfit)
          : "—",
      margin: seesFinancials ? formatMargin(effectivePricePreview?.marginPercentage ?? null) : "—",

      // A not-yet-saved draft can't be "expired" in the workflow sense — that
      // is an already-sent offer lapsing unanswered, and QuoteDetailStats'
      // EXPIRED/VALID UNTIL split is about that state, not a past-dated pick
      // in a form nobody has sent yet.
      expiry: form.validUntil ? formatDate(form.validUntil) : "—",
      isExpired: false,

      terms: form.terms,
      notes: form.internalNotes,
      decisionNote: editing?.decisionNote || "",
      isArchived: editing?.isArchived ?? false,
    };
  }, [
    editing, hasValidBase, trimmedBase, form.fetEnabled, fetRateShown, form.departureDate, form.returnDate,
    form.validUntil, form.quotedAircraft, form.passengers, form.terms, form.internalNotes,
    form.depositAmount, form.operatorCost, selectedClient, selectedBroker,
    selectedOperator, selectedOriginAirport, selectedDestinationAirport,
    selectedAircraft, previewLineItems, effectivePricePreview, seesFinancials,
  ]);

  // ---- Submit ------------------------------------------------------------
  const handleSubmit = (e) => {
    e.preventDefault();

    const errors = {};
    if (!form.clientId) errors.clientId = "Choose who this quote is for";
    if (!form.originAirportId) errors.originAirportId = "Departure airport is required";
    if (!form.destinationAirportId) errors.destinationAirportId = "Arrival airport is required";
    if (!form.departureDate) errors.departureDate = "Departure date is required";
    if (String(form.basePrice).trim() === "") {
      errors.basePrice = "The base price is required";
    }
    if (form.departureDate && form.returnDate && form.returnDate < form.departureDate) {
      errors.returnDate = "Return date cannot be before departure date";
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    // On edit a cleared box is sent as null, which is what clears it; an
    // omitted field is "leave it alone". Removing the photo, the terms or the
    // operator cost used to save as a no-op.
    const clear = { editing: Boolean(editing) };
    const payload = {
      clientId: form.clientId,
      tripRequestId: form.tripRequestId || null,
      assignedBrokerId: form.assignedBrokerId || null,
      operatorId: form.operatorId || null,
      originAirportId: form.originAirportId || null,
      destinationAirportId: form.destinationAirportId || null,
      aircraftId: form.aircraftId || null,
      quotedAircraft: optionalText(form.quotedAircraft, clear),
      exteriorImageUrl: optionalText(form.exteriorImageUrl, clear),
      departureDate: optionalText(form.departureDate, clear),
      returnDate: optionalText(form.returnDate, clear),
      validUntil: optionalText(form.validUntil, clear),
      passengers: optionalNumber(form.passengers, clear),
      basePrice: Number(form.basePrice),
      fetEnabled: form.fetEnabled,
      operatorCost: optionalNumber(form.operatorCost, clear),
      depositAmount: optionalNumber(form.depositAmount, clear),
      lineItems: validLineItemsForPreview,
      terms: optionalText(form.terms, clear),
      internalNotes: optionalText(form.internalNotes, clear),
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
      <DialogContent
        showCloseButton={false}
        className="w-[97vw] h-[94vh] max-w-none sm:max-w-none p-0 gap-0 flex flex-col overflow-hidden rounded-xl"
      >
        {/* Responsive switcher — only large screens show both panes at once */}
        <div className="lg:hidden border-b border-border px-4 pt-2">
          <DetailTabNav tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
          {/* Left: the form */}
          <form
            onSubmit={handleSubmit}
            className={cn(
              "flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4 w-full",
              activeTab !== "form" && "hidden lg:flex",
            )}
          >
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-border">
              <div className="flex flex-col gap-1">
                <h2 className="font-montserrat font-bold text-[20px] text-foreground">
                  {editing ? `Edit ${editing.reference}` : "New Quote"}
                </h2>
                <p className="font-montserrat text-[13px] text-muted-foreground">
                  {editing
                    ? "A change to the price cuts a new version; anything else leaves the version alone."
                    : "Saved as a draft. Nothing reaches the client until you send it."}
                </p>
              </div>
              <Button type="button" variant="ghost" size="icon-sm" onClick={handleClose} aria-label="Close">
                <X className="size-4" />
              </Button>
            </div>

            {!editing && (
              <FormField label="Linked enquiry" optional labelClassName={LABEL_CLASS}>
                <CommonSelect
                  value={form.tripRequestId}
                  onChange={handleLinkedTripChange}
                  options={linkedTripOptions}
                  placeholder="Select an open trip enquiry to pre-fill (or create standalone)"
                  className={cn(FIELD_CLASS, "w-full")}
                />
              </FormField>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              <FormField label="Client *" labelClassName={LABEL_CLASS} error={fieldErrors.clientId}>
                <ClientPicker
                  value={form.clientId}
                  onChange={handleClientChange}
                  placeholder="Select client"
                />
              </FormField>
              <FormField label="Broker" optional labelClassName={LABEL_CLASS}>
                <BrokerPicker
                  value={form.assignedBrokerId}
                  onChange={setField("assignedBrokerId")}
                  placeholder="Select broker"
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              <FormField label="Route from *" labelClassName={LABEL_CLASS} error={fieldErrors.originAirportId}>
                <AirportPicker
                  value={form.originAirportId}
                  onChange={setField("originAirportId")}
                  placeholder="Select departure airport"
                />
              </FormField>
              <FormField label="Route to *" labelClassName={LABEL_CLASS} error={fieldErrors.destinationAirportId}>
                <AirportPicker
                  value={form.destinationAirportId}
                  onChange={setField("destinationAirportId")}
                  placeholder="Select arrival airport"
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              <FormField label="Operator" optional labelClassName={LABEL_CLASS}>
                <OperatorPicker
                  value={form.operatorId}
                  onChange={setField("operatorId")}
                  placeholder="Select operator"
                />
              </FormField>
              <FormField label="Aircraft" optional labelClassName={LABEL_CLASS}>
                <AircraftPicker
                  value={form.aircraftId}
                  onChange={setField("aircraftId")}
                  params={form.operatorId ? { operatorId: form.operatorId } : undefined}
                  placeholder="Select from the fleet"
                />
              </FormField>
            </div>

            <FormField
              label="Or describe the aircraft"
              optional
              labelClassName={LABEL_CLASS}
            >
              <Input
                className={FIELD_CLASS}
                placeholder="e.g. Gulfstream G550 — not in the fleet"
                value={form.quotedAircraft}
                onChange={(e) => setField("quotedAircraft")(e.target.value)}
                disabled={Boolean(form.aircraftId)}
              />
            </FormField>

            <FormField label="Aircraft Photo" optional labelClassName={LABEL_CLASS}>
              <FileUpload
                variant="dropzone"
                kind="image"
                visibility="PUBLIC"
                accept={ACCEPT.image}
                heading="Drag & drop exterior photo"
                description="or click to upload"
                value={form.exteriorImageUrl}
                library
                suggested={fleetPhotos}
                onUploaded={(data) => setField("exteriorImageUrl")(data.url)}
                onRemove={() => setField("exteriorImageUrl")("")}
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
              <FormField label="Departure *" labelClassName={LABEL_CLASS} error={fieldErrors.departureDate}>
                <DatePicker
                  className={FIELD_CLASS}
                  value={form.departureDate}
                  onChange={setField("departureDate")}
                  placeholder="Choose Date"
                  max={form.returnDate || undefined}
                />
              </FormField>
              <FormField label="Return" optional labelClassName={LABEL_CLASS} error={fieldErrors.returnDate}>
                <DatePicker
                  className={FIELD_CLASS}
                  value={form.returnDate}
                  onChange={setField("returnDate")}
                  placeholder="Choose Date"
                  min={form.departureDate || undefined}
                />
              </FormField>
              <FormField label="Passengers" optional labelClassName={LABEL_CLASS}>
                <Input
                  className={FIELD_CLASS}
                  type="number"
                  min="1"
                  placeholder="e.g. 4"
                  value={form.passengers}
                  onChange={(e) => setField("passengers")(e.target.value)}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              <FormField
                label="Base price ($) *"
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
              <FormField label="Valid until / expiry" optional labelClassName={LABEL_CLASS}>
                <DatePicker
                  className={FIELD_CLASS}
                  value={form.validUntil}
                  onChange={setField("validUntil")}
                  placeholder="Choose Date"
                />
              </FormField>
            </div>

            {/* Workflow facts, not form inputs — a quote is born DRAFT and
                only moves through the Send/Approve/Reject/Expire actions
                (Status Actions, in the preview), never by posting a status
                straight at create/update. Shown so the form matches what the
                document on the right already says, never submitted. */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              <FormField label="Quote Status">
                <div className={READ_ONLY_CLASS}>
                  {editing ? formatQuoteStatus(editing.rawStatus) : "Draft"}
                </div>
              </FormField>
              <FormField label="Sent Date">
                <div className={READ_ONLY_CLASS}>{editing?.sent ?? "—"}</div>
              </FormField>
            </div>

            {/* The cost side is a financial field. A role without
                VIEW_MONEY never sees the margin on a quote, so offering
                them the box that sets it would be offering a control whose
                result they cannot read. */}
            {seesFinancials && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                <FormField label="Operator cost ($)" optional labelClassName={LABEL_CLASS}>
                  <Input
                    className={FIELD_CLASS}
                    type="number"
                    min="0"
                    placeholder="e.g. 65000"
                    value={form.operatorCost}
                    onChange={(e) => setField("operatorCost")(e.target.value)}
                  />
                </FormField>
                <FormField label="Deposit ($)" optional labelClassName={LABEL_CLASS}>
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

            {seesFinancials && (
              <SuggestedPricePicker
                operatorCost={form.operatorCost}
                fetEnabled={form.fetEnabled}
                lineItems={validLineItemsForPreview}
                basePrice={form.basePrice}
                onPick={(price) => setField("basePrice")(String(price))}
              />
            )}

            {/* Federal Excise Tax. A switch rather than a number, because the
                rate is statutory — the question a broker answers is whether the
                leg is taxable at all, and an international one is not. */}
            <div className="flex items-center justify-between p-3 rounded-md border border-input bg-secondary/20">
              <div className="flex flex-col">
                <span className="font-montserrat font-semibold text-[13px] text-warning">
                  Federal Excise Tax ({formatFetRate(fetRateShown)})
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

            {/* Extras — catering, ground transportation, de-icing. Mirrors
                `Quote.lineItems`: a priced line adds to the total, an
                "Included" line prints on the offer with no amount against it. */}
            <div className="flex flex-col gap-2.5 w-full">
              <div className="flex items-center justify-between">
                <span className="font-montserrat font-bold text-[13px] text-foreground">
                  Extras <span className="text-muted-foreground font-normal text-[11px]">(Optional)</span>
                </span>
                <button
                  type="button"
                  onClick={addLineItem}
                  className="flex items-center gap-1 font-montserrat font-bold text-[12px] text-purple hover:opacity-80 cursor-pointer"
                >
                  <Plus className="size-3.5" /> Add
                </button>
              </div>

              {form.lineItems.length === 0 ? (
                <p className="font-montserrat text-[12px] text-muted-foreground">
                  Catering, ground transportation, de-icing — anything on top of
                  the base charter price.
                </p>
              ) : (
                <div className="flex flex-col gap-2 w-full">
                  {form.lineItems.map((item) => (
                    <div
                      key={item.key}
                      className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full p-2.5 rounded-md border border-border/60 bg-secondary/10"
                    >
                      <Input
                        placeholder="e.g. Catering"
                        value={item.label}
                        onChange={(e) => updateLineItem(item.key, "label", e.target.value)}
                        className={cn(FIELD_CLASS, "flex-1 min-w-0")}
                      />
                      <div className="flex items-center gap-2 shrink-0">
                        <Input
                          type="number"
                          min="0"
                          placeholder="Amount"
                          value={item.amount}
                          disabled={item.included}
                          onChange={(e) => updateLineItem(item.key, "amount", e.target.value)}
                          className={cn(FIELD_CLASS, "w-24 sm:w-28")}
                        />
                        <label className="flex items-center gap-1.5 font-montserrat text-[12px] text-muted-foreground whitespace-nowrap cursor-pointer">
                          <Checkbox
                            checked={item.included}
                            onCheckedChange={(v) => updateLineItem(item.key, "included", Boolean(v))}
                          />
                          Included
                        </label>
                        <button
                          type="button"
                          onClick={() => removeLineItem(item.key)}
                          className="p-2 text-destructive hover:bg-destructive/10 rounded-md transition-colors cursor-pointer"
                          aria-label="Remove line item"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <FormField label="Terms" optional labelClassName={LABEL_CLASS}>
              <Textarea
                placeholder="Printed on the quote the client sees."
                value={form.terms}
                onChange={(e) => setField("terms")(e.target.value)}
                className="min-h-20 text-[13px] font-montserrat resize-none"
              />
            </FormField>

            <FormField label="Internal notes" optional labelClassName={LABEL_CLASS}>
              <Textarea
                placeholder="Never shown to the client."
                value={form.internalNotes}
                onChange={(e) => setField("internalNotes")(e.target.value)}
                className="min-h-16 text-[13px] font-montserrat resize-none"
              />
            </FormField>

            {editing && (
              <FormField label="What changed" optional labelClassName={LABEL_CLASS}>
                <Input
                  className={FIELD_CLASS}
                  placeholder="e.g. Added the return leg"
                  value={form.versionNote}
                  onChange={(e) => setField("versionNote")(e.target.value)}
                />
              </FormField>
            )}

            {/* Live — every figure here came back from POST /quotes/price-preview,
                not from arithmetic run in this component. */}
            <div
              className={cn(
                "grid grid-cols-2 gap-3 w-full p-4 rounded-lg bg-secondary/20 border border-border/80 text-center",
                seesFinancials ? "sm:grid-cols-4" : "sm:grid-cols-3",
              )}
            >
              <div className="flex flex-col gap-0.5">
                <span className="font-montserrat text-[11px] font-medium text-muted-foreground tracking-wider uppercase">
                  Base
                </span>
                <span className="font-montserrat font-bold text-[16px] text-foreground">
                  {previewQuote.basePrice}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-montserrat text-[11px] font-medium text-warning tracking-wider uppercase">
                  FET
                </span>
                <span className="font-montserrat font-bold text-[16px] text-warning">
                  {previewQuote.fet}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-montserrat text-[11px] font-medium text-success tracking-wider uppercase">
                  Total
                </span>
                <span className="font-montserrat font-bold text-[16px] text-success">
                  {previewQuote.total}
                </span>
              </div>
              {seesFinancials && (
                <div className="flex flex-col gap-0.5">
                  <span className="font-montserrat text-[11px] font-medium text-purple tracking-wider uppercase">
                    Margin
                  </span>
                  <span className="font-montserrat font-bold text-[16px] text-purple">
                    {previewQuote.margin}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-start gap-3 pt-3 border-t border-border/40 w-full mt-auto">
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

          {/* Right: the live preview — the quote as it will read once saved. */}
          <div
            className={cn(
              "flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 border-t lg:border-t-0 lg:border-l border-border bg-secondary/20 flex flex-col gap-5",
              activeTab !== "preview" && "hidden lg:flex",
            )}
          >
            <TribecaLetterhead />

            <div className="flex flex-col items-center justify-center text-center gap-1 py-1">
              <h2 className="font-montserrat font-bold text-[20px] tracking-[0.38em] text-foreground uppercase">
                QUOTES
              </h2>
              <p className="font-montserrat font-medium text-[12px] text-muted-foreground">
                {previewQuote.reference}
              </p>
            </div>

            <PhotoTile
              src={form.exteriorImageUrl ? uploadUrl(form.exteriorImageUrl) : null}
              alt="Aircraft exterior"
              label="Aircraft Exterior"
              images={[{ src: uploadUrl(form.exteriorImageUrl), alt: "Aircraft exterior", loader: passthroughImageLoader }]}
              loader={passthroughImageLoader}
            />

            {/* Same stats row QuoteDetailsView shows for a saved quote — not
                a second, preview-only copy of the same five tiles. */}
            <QuoteDetailStats quote={previewQuote} />

            <QuoteBreakdownCard quote={previewQuote} />
            {editing && <QuoteVersionsCard quote={editing} />}
            <FlightDetailsCard quote={previewQuote} />
            {seesFinancials && <QuoteProfitabilityCard quote={previewQuote} />}
            {editing && <QuoteStatusActionsCard quote={editing} />}
            <QuoteNotesCard quote={previewQuote} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
