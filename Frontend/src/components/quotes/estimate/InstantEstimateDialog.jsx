"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import FilterTabs from "@/components/table/common/FilterTabs";
import PickerSelect from "@/components/trips/PickerSelect";
import SuggestedPricePicker from "@/components/quotes/pricing/SuggestedPricePicker";
import CharterRatesEditor from "@/components/quotes/estimate/CharterRatesEditor";
import { useAirports } from "@/hooks/airports";
import { useCharterEstimate } from "@/hooks/charter-rates";
import { useQuotesStore } from "@/store/useQuotesStore";
import { formatAircraftCategory } from "@/lib/aircraft";
import { formatMoney } from "@/lib/money";
import { optionalNumber } from "@/lib/form";
import { cn } from "@/lib/utils";

const TABS = ["Estimate", "Rates"];
const FIELD_CLASS = "h-10 text-[13px]";

/**
 * Client adjustment #6: "put in size of plane, airports and such and it give
 * is an estimate of what it could cost … then a 'suggested price' option where
 * I can select different percentages".
 *
 * Pick a route and a party size; the server measures the great-circle
 * distance and, for every aircraft category, works out flight time and cost
 * from the **desk's own rates** (the Rates tab). A category with no rate says
 * "No rate on file" — never $0, never a guess. Choosing a priced category
 * shows the suggested prices at each markup over that estimate, and "Start a
 * quote" opens a new quote with the route, party and chosen price filled in.
 *
 * The estimate is not written into the quote's operator cost: that field is
 * what the operator actually charges, and an estimate sitting in it would be
 * read later as a real price.
 */
export default function InstantEstimateDialog() {
  const open = useQuotesStore((s) => s.estimateModalOpen);
  const close = useQuotesStore((s) => s.closeEstimateModal);
  const openAddQuoteModal = useQuotesStore((s) => s.openAddQuoteModal);

  const [tab, setTab] = useState("Estimate");
  const [originAirportId, setOrigin] = useState("");
  const [destinationAirportId, setDestination] = useState("");
  const [passengers, setPassengers] = useState("");
  const [roundTrip, setRoundTrip] = useState(false);
  const [result, setResult] = useState(null);
  const [selected, setSelected] = useState(null);
  const [basePrice, setBasePrice] = useState("");

  const { data: airports } = useAirports({ limit: 100 }, { enabled: open });
  const airportOptions = useMemo(
    () =>
      (airports?.data ?? []).map((a) => ({
        value: a.id,
        label: `${a.icao} · ${a.city ?? a.name}`,
      })),
    [airports?.data],
  );

  const { mutate: estimate, isPending } = useCharterEstimate();
  const party = optionalNumber(passengers);
  const ready = Boolean(originAirportId && destinationAirportId && originAirportId !== destinationAirportId);

  // Re-estimate as the inputs settle. The result is only shown while it
  // still describes the route on screen (see `current` below).
  useEffect(() => {
    if (!open || !ready) return undefined;
    const handle = setTimeout(() => {
      estimate(
        { originAirportId, destinationAirportId, passengers: party, roundTrip },
        { onSuccess: (data) => setResult(data) },
      );
    }, 300);
    return () => clearTimeout(handle);
  }, [open, ready, originAirportId, destinationAirportId, party, roundTrip, estimate]);

  const current =
    ready &&
    result?.origin?.id === originAirportId &&
    result?.destination?.id === destinationAirportId &&
    result?.legs === (roundTrip ? 2 : 1) &&
    (result?.passengers ?? undefined) === party
      ? result
      : null;
  const chosen = current?.options?.find((o) => o?.category === selected && o?.estimate) ?? null;

  const handleClose = () => {
    setTab("Estimate");
    setOrigin("");
    setDestination("");
    setPassengers("");
    setRoundTrip(false);
    setResult(null);
    setSelected(null);
    setBasePrice("");
    close?.();
  };

  const startQuote = () => {
    openAddQuoteModal?.(null, {
      originAirportId,
      destinationAirportId,
      ...(party !== undefined ? { passengers: String(party) } : {}),
      ...(basePrice ? { basePrice } : {}),
    });
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 flex flex-col gap-4">
        <DialogHeader className="flex flex-col items-start gap-1 pb-2 border-b border-border">
          <DialogTitle className="font-montserrat font-bold text-[18px] sm:text-[20px] text-foreground">
            Instant Estimate
          </DialogTitle>
          <DialogDescription className="font-montserrat text-[13px] text-muted-foreground">
            What a route could cost by aircraft size, from the desk&apos;s own rates.
          </DialogDescription>
        </DialogHeader>

        <FilterTabs options={TABS} value={tab} onValueChange={setTab} />

        {tab === "Rates" ? (
          <CharterRatesEditor enabled={open} />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5 font-montserrat text-[12px] font-medium text-foreground">
                From
                <PickerSelect
                  value={originAirportId}
                  onChange={setOrigin}
                  options={airportOptions}
                  placeholder="Departure airport"
                  className={FIELD_CLASS}
                />
              </label>
              <label className="flex flex-col gap-1.5 font-montserrat text-[12px] font-medium text-foreground">
                To
                <PickerSelect
                  value={destinationAirportId}
                  onChange={setDestination}
                  options={airportOptions}
                  placeholder="Arrival airport"
                  className={FIELD_CLASS}
                />
              </label>
            </div>

            <div className="flex flex-wrap items-end gap-4">
              <label className="flex flex-col gap-1.5 font-montserrat text-[12px] font-medium text-foreground">
                Passengers (Optional)
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={passengers}
                  onChange={(e) => setPassengers(e.target.value)}
                  placeholder="e.g. 6"
                  className="w-28 h-10 px-3 rounded-md border border-input bg-background text-[13px] outline-none focus:ring-1 focus:ring-purple"
                />
              </label>
              <label className="flex items-center gap-2 h-10 font-montserrat text-[13px] text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={roundTrip}
                  onChange={(e) => setRoundTrip(e.target.checked)}
                  className="size-4 accent-purple"
                />
                Round trip
              </label>
            </div>

            {originAirportId && originAirportId === destinationAirportId && (
              <p className="font-montserrat text-[12px] text-destructive">Choose two different airports.</p>
            )}

            {!ready ? (
              <p className="font-montserrat text-[13px] text-muted-foreground py-4">
                Choose where the trip starts and where it goes.
              </p>
            ) : !current ? (
              <div className="flex items-center gap-2 py-4 text-muted-foreground font-montserrat text-[13px]">
                {isPending && <Loader2 className="size-4 animate-spin" />}
                {isPending ? "Estimating…" : "No estimate for this route."}
              </div>
            ) : (
              <>
                <p className="font-montserrat text-[13px] text-foreground">
                  <span className="font-semibold">
                    {current.origin?.icao} → {current.destination?.icao}
                  </span>{" "}
                  · {current.distanceNm?.toLocaleString()} nm great-circle
                  {current.legs === 2 ? " · round trip, 2 legs" : " · one way"}
                  <span className="block text-[11px] text-muted-foreground">
                    Winds, routing and positioning legs are not included.
                  </span>
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {current.options?.map((option) => (
                    <EstimateOption
                      key={option?.category}
                      option={option}
                      party={party}
                      selected={selected === option?.category}
                      onSelect={() => {
                        setSelected(option?.category);
                        setBasePrice("");
                      }}
                    />
                  ))}
                </div>

                {chosen && (
                  <div className="flex flex-col gap-3 pt-2 border-t border-border">
                    <p className="font-montserrat text-[13px] text-foreground">
                      {formatAircraftCategory(chosen.category)} · estimated operator cost{" "}
                      <span className="font-semibold">{formatMoney(chosen.estimate?.estimatedCost)}</span>
                    </p>
                    <SuggestedPricePicker
                      operatorCost={String(chosen.estimate?.estimatedCost ?? "")}
                      fetEnabled
                      lineItems={[]}
                      basePrice={basePrice}
                      onPick={(price) => setBasePrice(String(price))}
                    />
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-2 pt-2 border-t border-border">
                  <span className="font-montserrat text-[11px] text-muted-foreground sm:mr-auto">
                    The quote opens with the route{basePrice ? " and the chosen price" : ""}; the operator cost stays
                    empty until the operator quotes.
                  </span>
                  <Button type="button" onClick={startQuote} className="h-10 px-4 text-[13px]">
                    Start a quote
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** One aircraft category's estimate, or an honest "No rate on file". */
function EstimateOption({ option, party, selected, onSelect }) {
  const est = option?.estimate;
  const fits = option?.fitsParty;

  return (
    <button
      type="button"
      onClick={est ? onSelect : undefined}
      disabled={!est}
      aria-pressed={selected}
      className={cn(
        "flex flex-col items-start gap-1 p-3 rounded-md border text-left transition-colors",
        est ? "cursor-pointer hover:border-purple" : "cursor-default bg-secondary/30",
        selected ? "border-purple bg-purple/10" : "border-input",
      )}
    >
      <div className="flex items-center justify-between gap-2 w-full">
        <span className="font-montserrat font-semibold text-[13px] text-foreground">
          {formatAircraftCategory(option?.category)}
        </span>
        {party !== undefined && (
          <span
            className={cn(
              "font-montserrat text-[11px] font-medium",
              fits === true ? "text-success" : fits === false ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {fits === true
              ? `Seats ${option?.typicalSeats}`
              : fits === false
                ? `Seats ${option?.typicalSeats} — too small`
                : "Seats not on file"}
          </span>
        )}
      </div>
      {est ? (
        <>
          <span className="font-montserrat font-bold text-[16px] text-foreground">
            {formatMoney(est.estimatedCost)}
          </span>
          <span className="font-montserrat text-[11px] text-muted-foreground">
            {est.flightHoursPerLeg} h per leg · {est.totalBilledHours} h billed
          </span>
        </>
      ) : (
        <span className="font-montserrat text-[12px] text-muted-foreground">No rate on file</span>
      )}
    </button>
  );
}
