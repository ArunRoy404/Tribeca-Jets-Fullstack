"use client";

import { useState, useEffect, useMemo } from "react";
import { Edit, Plus, X } from "lucide-react";
import { useQuotesStore } from "@/store/useQuotesStore";
import {
  quoteClientsOptions,
  quoteBrokerOptions,
  quoteAircraftOptions,
  quoteStatusOptions,
} from "@/dummyData/quotes";
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
import CommonDatePicker from "@/components/common/DatePicker";

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

export default function AddQuoteDialog() {
  const open = useQuotesStore((s) => s.addModalOpen);
  const editingQuote = useQuotesStore((s) => s.editingQuote);
  const closeModal = useQuotesStore((s) => s.closeAddQuoteModal);
  const addQuote = useQuotesStore((s) => s.addQuote);
  const updateQuote = useQuotesStore((s) => s.updateQuote);

  // Form State
  const [client, setClient] = useState("Jonathan Reed");
  const [broker, setBroker] = useState("Barry Wilson");
  const [origin, setOrigin] = useState("KTEB");
  const [destination, setDestination] = useState("KPBI");
  const [aircraft, setAircraft] = useState("Gulfstream G550");
  const [departureDate, setDepartureDate] = useState("Aug 15");
  const [returnDate, setReturnDate] = useState("Aug 18");
  const [status, setStatus] = useState("Draft");
  const [fetEnabled, setFetEnabled] = useState(true);
  const [operatorCost, setOperatorCost] = useState("65000");
  const [basePrice, setBasePrice] = useState("79500");
  const [sentDate, setSentDate] = useState("Aug 9");
  const [expiryDate, setExpiryDate] = useState("Aug 12");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (editingQuote) {
      setClient(editingQuote.client || "Jonathan Reed");
      setBroker(editingQuote.brokerFullName || editingQuote.broker || "Barry Wilson");
      setOrigin(editingQuote.origin || "KTEB");
      setDestination(editingQuote.destination || "KPBI");
      setAircraft(editingQuote.aircraft || "Gulfstream G550");
      setDepartureDate(editingQuote.date || editingQuote.departureDate || "Aug 15");
      setReturnDate(editingQuote.returnDate || "");
      setStatus(editingQuote.status || "Draft");
      setFetEnabled(editingQuote.fetEnabled !== false);
      setOperatorCost(String(editingQuote.operatorCost || "65000"));
      setBasePrice(String(editingQuote.basePrice || "79500"));
      setSentDate(editingQuote.sentDate || "Aug 9");
      setExpiryDate(editingQuote.expiryDate || "Aug 12");
      setNotes(editingQuote.notes || "");
    } else {
      setClient("Jonathan Reed");
      setBroker("Barry Wilson");
      setOrigin("KTEB");
      setDestination("KPBI");
      setAircraft("Gulfstream G550");
      setDepartureDate("Aug 15");
      setReturnDate("Aug 18");
      setStatus("Draft");
      setFetEnabled(true);
      setOperatorCost("65000");
      setBasePrice("79500");
      setSentDate("Aug 9");
      setExpiryDate("Aug 12");
      setNotes("");
    }
  }, [editingQuote, open]);

  // Live Calculations
  const calculations = useMemo(() => {
    const base = parseFloat(basePrice.replace(/[^0-9.]/g, "")) || 0;
    const opCost = parseFloat(operatorCost.replace(/[^0-9.]/g, "")) || 0;
    const fet = fetEnabled ? Math.round(base * 0.075) : 0;
    const total = base + fet;
    const profit = total - opCost;
    const marginPct = total > 0 ? ((profit / total) * 100).toFixed(1) : "0.0";

    return {
      baseFormatted: `$${base.toLocaleString()}`,
      fetFormatted: `$${fet.toLocaleString()}`,
      totalFormatted: `$${total.toLocaleString()}`,
      marginFormatted: `$${profit.toLocaleString()} (${marginPct}%)`,
      base,
      fet,
      total,
      profit,
    };
  }, [basePrice, operatorCost, fetEnabled]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const selectedClientObj = quoteClientsOptions.find((c) => c.name === client);
    const clientTier = selectedClientObj ? selectedClientObj.tier : "Standard";
    const company = selectedClientObj ? selectedClientObj.company : "Direct Client";

    const payload = {
      client,
      clientTier,
      company,
      broker,
      brokerFullName: broker,
      origin: origin.toUpperCase(),
      destination: destination.toUpperCase(),
      aircraft,
      departureDate,
      date: departureDate,
      returnDate,
      status,
      fetEnabled,
      operatorCost: calculations.base > 0 ? parseFloat(operatorCost) || 0 : 0,
      basePrice: calculations.base,
      sentDate,
      expiryDate,
      notes,
    };

    if (editingQuote) {
      updateQuote(editingQuote.id, payload);
    } else {
      addQuote(payload);
    }
    closeModal();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeModal()}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto p-6 flex flex-col gap-4">
        <DialogHeader className="flex flex-col items-start gap-1 pb-2 border-b border-border">
          <DialogTitle className="font-montserrat font-bold text-[20px] text-foreground">
            {editingQuote ? "Edit Quote" : "New Quote"}
          </DialogTitle>
          <DialogDescription className="font-montserrat text-[13px] text-muted-foreground">
            {editingQuote
              ? `Update details and financial calculations for ${editingQuote.id}.`
              : "Generate an accurate client charter quote with automatic FET and margin calculations."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
          {/* Row 1: Client & Broker */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <FieldWrapper label="Client">
              <select
                value={client}
                onChange={(e) => setClient(e.target.value)}
                className="h-10 px-3 rounded-md border border-input bg-background font-montserrat text-[13px] text-foreground outline-none focus:ring-1 focus:ring-purple w-full cursor-pointer"
                required
              >
                {quoteClientsOptions.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name} ({c.company})
                  </option>
                ))}
              </select>
            </FieldWrapper>

            <FieldWrapper label="Broker">
              <select
                value={broker}
                onChange={(e) => setBroker(e.target.value)}
                className="h-10 px-3 rounded-md border border-input bg-background font-montserrat text-[13px] text-foreground outline-none focus:ring-1 focus:ring-purple w-full cursor-pointer"
                required
              >
                {quoteBrokerOptions
                  .filter((b) => b !== "All Brokers")
                  .map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
              </select>
            </FieldWrapper>
          </div>

          {/* Row 2: Route From / To (ICAO) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <FieldWrapper label="Route From (ICAO)">
              <Input
                placeholder="KTEB"
                value={origin}
                onChange={(e) => setOrigin(e.target.value.toUpperCase())}
                className="h-10 text-[13px] font-montserrat uppercase"
                required
              />
            </FieldWrapper>

            <FieldWrapper label="Route to (ICAO)">
              <Input
                placeholder="KPBI"
                value={destination}
                onChange={(e) => setDestination(e.target.value.toUpperCase())}
                className="h-10 text-[13px] font-montserrat uppercase"
                required
              />
            </FieldWrapper>
          </div>

          {/* Row 3: Aircraft, Departure, Return, Quote Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
            <FieldWrapper label="Aircraft">
              <select
                value={aircraft}
                onChange={(e) => setAircraft(e.target.value)}
                className="h-10 px-3 rounded-md border border-input bg-background font-montserrat text-[13px] text-foreground outline-none focus:ring-1 focus:ring-purple w-full cursor-pointer"
                required
              >
                {quoteAircraftOptions.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </FieldWrapper>

            <FieldWrapper label="Departure">
              <CommonDatePicker
                value={departureDate}
                onChange={setDepartureDate}
                placeholder="Choose Date"
                className="h-10"
              />
            </FieldWrapper>

            <FieldWrapper label="Return" optional>
              <CommonDatePicker
                value={returnDate}
                onChange={setReturnDate}
                placeholder="Choose Date"
                className="h-10"
              />
            </FieldWrapper>
          </div>

          {/* Row 4: Quote Status & FET Toggle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <FieldWrapper label="Quote Status">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="h-10 px-3 rounded-md border border-input bg-background font-montserrat text-[13px] text-foreground outline-none focus:ring-1 focus:ring-purple w-full cursor-pointer"
              >
                {quoteStatusOptions
                  .filter((s) => s !== "All Status")
                  .map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
              </select>
            </FieldWrapper>

            {/* FET Toggle */}
            <div className="flex items-center justify-between p-3 rounded-md border border-input bg-secondary/20 self-end h-10">
              <span className="font-montserrat font-semibold text-[13px] text-warning">
                FET (7.5%)
              </span>
              <Switch
                checked={fetEnabled}
                onCheckedChange={setFetEnabled}
                className="data-checked:bg-warning"
              />
            </div>
          </div>

          {/* Row 5: Operator Cost & Base Price */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <FieldWrapper label="Operator Cost ($)">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-montserrat text-[13px] text-muted-foreground">
                  $
                </span>
                <Input
                  type="number"
                  placeholder="65000"
                  value={operatorCost}
                  onChange={(e) => setOperatorCost(e.target.value)}
                  className="h-10 pl-7 text-[13px] font-montserrat"
                  required
                />
              </div>
            </FieldWrapper>

            <FieldWrapper label="Base Price ($)">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-montserrat text-[13px] text-muted-foreground">
                  $
                </span>
                <Input
                  type="number"
                  placeholder="79500"
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  className="h-10 pl-7 text-[13px] font-montserrat"
                  required
                />
              </div>
            </FieldWrapper>
          </div>

          {/* Row 6: Sent Date & Expiry Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <FieldWrapper label="Sent Date">
              <CommonDatePicker
                value={sentDate}
                onChange={setSentDate}
                placeholder="Choose Date"
                className="h-10"
              />
            </FieldWrapper>

            <FieldWrapper label="Expiry Date">
              <CommonDatePicker
                value={expiryDate}
                onChange={setExpiryDate}
                placeholder="Choose Date"
                className="h-10"
              />
            </FieldWrapper>
          </div>

          {/* Row 7: Notes / Terms */}
          <FieldWrapper label="Notes / Terms" optional>
            <Textarea
              placeholder="Quote terms and conditions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-20 text-[13px] font-montserrat resize-none"
            />
          </FieldWrapper>

          {/* Calculation Summary Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full p-4 rounded-lg bg-[#F8F9FB] border border-border/80 text-center">
            <div className="flex flex-col gap-0.5">
              <span className="font-montserrat text-[11px] font-medium text-muted-foreground tracking-wider uppercase">
                Base
              </span>
              <span className="font-montserrat font-bold text-[16px] text-foreground">
                {calculations.baseFormatted}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="font-montserrat text-[11px] font-medium text-warning tracking-wider uppercase">
                FET 7.5%
              </span>
              <span className="font-montserrat font-bold text-[16px] text-warning">
                {calculations.fetFormatted}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="font-montserrat text-[11px] font-medium text-success tracking-wider uppercase">
                Total
              </span>
              <span className="font-montserrat font-bold text-[16px] text-success">
                {calculations.totalFormatted}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="font-montserrat text-[11px] font-medium text-purple tracking-wider uppercase">
                Margin
              </span>
              <span className="font-montserrat font-bold text-[16px] text-purple">
                {calculations.marginFormatted}
              </span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-start gap-3 pt-3 border-t border-border/40 w-full">
            <Button
              type="button"
              variant="outline"
              className="h-10 px-4 font-medium text-[13px] gap-1.5 cursor-pointer"
              onClick={closeModal}
            >
              <X className="size-3.5" />
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-[#252832] hover:bg-[#252832]/90 text-white h-10 px-5 font-medium text-[13px] gap-1.5 cursor-pointer shadow-button"
            >
              {editingQuote ? <Edit className="size-3.5" /> : <Plus className="size-3.5" />}
              {editingQuote ? "Save Changes" : "Add Quote"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

