"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useSuggestedQuotePrice } from "@/hooks/quotes";
import { formatMoney } from "@/lib/money";
import { optionalNumber } from "@/lib/form";
import { cn } from "@/lib/utils";

/**
 * The markups offered as one-click choices, as rates (0.15 = 15%).
 *
 * These are the *options on a control*, not data: nothing is displayed until
 * the broker has typed the operator's cost, and every figure shown is the
 * server's. The custom box beside them takes any other percentage. Adjust the
 * list here if the desk works in different steps.
 */
const PRESET_MARKUPS = [0.1, 0.15, 0.2, 0.25];

/**
 * Client adjustment #6's "suggested price" selector — "select different
 * percentages that can make me determine price to client".
 *
 * Given the operator's cost, shows the base price at each markup and what it
 * totals to the client with FET and extras, all computed by the server's
 * pricing engine (`POST /quotes/suggested-price`) — this component does no
 * money arithmetic of its own. Choosing one writes it into the base price
 * field, where the broker can still change it; the percentage itself is not
 * stored, because it is a way to arrive at the price, not a second fact about
 * the quote.
 */
export default function SuggestedPricePicker({ operatorCost, fetEnabled, lineItems, basePrice, onPick }) {
  const [customPercent, setCustomPercent] = useState("");
  const [result, setResult] = useState(null);
  const { mutate: fetchSuggestions, isPending } = useSuggestedQuotePrice();

  const cost = optionalNumber(operatorCost);
  const hasCost = cost !== undefined && cost > 0;

  const customRate = useMemo(() => {
    const percent = optionalNumber(customPercent);
    if (percent === undefined || percent < 0 || percent > 500) return undefined;
    return Math.round(percent * 100) / 10000;
  }, [customPercent]);

  const markupRates = useMemo(() => {
    const rates = [...PRESET_MARKUPS];
    if (customRate !== undefined && !rates.includes(customRate)) rates.push(customRate);
    return rates;
  }, [customRate]);

  useEffect(() => {
    if (!hasCost) return undefined;
    const handle = setTimeout(() => {
      fetchSuggestions(
        { operatorCost: cost, markupRates, fetEnabled, lineItems },
        {
          onSuccess: (data) => setResult(data),
          onError: () => setResult(null),
        },
      );
    }, 400);
    return () => clearTimeout(handle);
  }, [hasCost, cost, markupRates, fetEnabled, lineItems, fetchSuggestions]);

  // A stale answer for a cost that has since been cleared or changed must not
  // be offered — only suggestions computed from the cost on screen.
  const suggestions = hasCost && result?.operatorCost === cost ? result?.suggestions ?? [] : [];
  const current = optionalNumber(basePrice);

  return (
    <div className="flex flex-col gap-2 p-3 rounded-md border border-input bg-secondary/20 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex flex-col">
          <span className="font-montserrat font-semibold text-[13px] text-foreground">Suggested price</span>
          <span className="font-montserrat text-[11px] text-muted-foreground">
            A markup over the operator cost. Pick one to fill the base price.
          </span>
        </div>
        <label className="flex items-center gap-2 font-montserrat text-[12px] text-muted-foreground shrink-0">
          Custom
          <span className="flex items-center gap-1">
            <input
              type="number"
              min="0"
              max="500"
              step="0.5"
              value={customPercent}
              onChange={(e) => setCustomPercent(e.target.value)}
              placeholder="e.g. 18"
              className="w-20 h-8 px-2 rounded-md border border-input bg-background text-[12px] text-foreground outline-none focus:ring-1 focus:ring-purple"
            />
            %
          </span>
        </label>
      </div>

      {!hasCost ? (
        <p className="font-montserrat text-[12px] text-muted-foreground">
          Enter the operator cost to see suggested prices.
        </p>
      ) : suggestions.length === 0 ? (
        <div className="flex items-center gap-2 text-muted-foreground font-montserrat text-[12px]">
          {isPending && <Loader2 className="size-3.5 animate-spin" />}
          {isPending ? "Working out suggestions…" : "Suggestions unavailable — type the price instead."}
        </div>
      ) : (
        <div className={cn("grid grid-cols-2 sm:grid-cols-3 gap-2 transition-opacity", isPending && "opacity-60")}>
          {suggestions.map((s) => {
            const selected = current === s?.basePrice;
            return (
              <button
                key={s?.markupRate}
                type="button"
                onClick={() => onPick?.(s?.basePrice)}
                aria-pressed={selected}
                className={cn(
                  "flex flex-col items-start gap-0.5 p-2 rounded-md border text-left transition-colors cursor-pointer",
                  selected ? "border-purple bg-purple/10" : "border-input bg-background hover:border-purple",
                )}
              >
                <span className="font-montserrat font-semibold text-[12px] text-purple">
                  +{Math.round(s?.markupRate * 1000) / 10}%
                </span>
                <span className="font-montserrat font-bold text-[14px] text-foreground">{formatMoney(s?.basePrice)}</span>
                <span className="font-montserrat text-[11px] text-muted-foreground">
                  {formatMoney(s?.totalPrice)} to client
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
