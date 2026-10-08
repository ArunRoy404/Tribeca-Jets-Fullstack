"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCharterRates, useSetCharterRate } from "@/hooks/charter-rates";
import { useCurrentUser } from "@/hooks/auth";
import { isAdministratorRole } from "@/lib/roles";
import { formatAircraftCategory } from "@/lib/aircraft";
import { formatMoney } from "@/lib/money";
import { optionalNumber } from "@/lib/form";

const INPUT_CLASS =
  "w-full h-9 px-2 rounded-md border border-input bg-background text-[12px] text-foreground outline-none focus:ring-1 focus:ring-purple";

/**
 * The desk's rates per aircraft category — the data behind the instant
 * estimate. Every category is listed, priced or not.
 *
 * Editing is for an administrator (owner's decision, 8 Oct 2026): every
 * estimate is built on these company-wide numbers. Everyone else who can see
 * quote money sees the table read-only. The inputs are hidden rather than
 * disabled for them, per the project rule, and the API refuses the write
 * regardless.
 */
export default function CharterRatesEditor({ enabled = true }) {
  const { data, isLoading } = useCharterRates({ enabled });
  const { data: me } = useCurrentUser();
  const mayEdit = isAdministratorRole(me?.role);
  const rates = data?.data ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="font-montserrat text-[12px] text-muted-foreground">
        {mayEdit
          ? "What the desk pays per flight hour, by aircraft size. Leave a field blank to clear it; a category with no hourly rate or speed cannot be estimated."
          : "The desk's rates per flight hour. An administrator sets them."}
      </p>
      <div className="flex flex-col gap-2">
        {rates.map((rate) =>
          mayEdit ? (
            <RateRowEditor key={`${rate?.category}-${rate?.updatedAt ?? "new"}`} rate={rate} />
          ) : (
            <RateRowView key={rate?.category} rate={rate} />
          ),
        )}
      </div>
    </div>
  );
}

function RateRowView({ rate }) {
  const priced = rate?.hourlyRate != null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-md border border-input">
      <span className="font-montserrat font-semibold text-[13px] text-foreground">
        {formatAircraftCategory(rate?.category)}
      </span>
      <span className="font-montserrat text-[12px] text-muted-foreground">
        {priced
          ? `${formatMoney(rate.hourlyRate)}/h · ${rate?.averageSpeedKnots ?? "—"} kt · ${rate?.typicalSeats ?? "—"} seats${
              rate?.minimumHours != null ? ` · min ${rate.minimumHours} h` : ""
            }`
          : "No rate on file"}
      </span>
    </div>
  );
}

const toField = (value) => (value === null || value === undefined ? "" : String(value));

/** One category's editable figures. Keyed by `updatedAt`, so a save reseeds it. */
function RateRowEditor({ rate }) {
  const [form, setForm] = useState({
    hourlyRate: toField(rate?.hourlyRate),
    averageSpeedKnots: toField(rate?.averageSpeedKnots),
    typicalSeats: toField(rate?.typicalSeats),
    minimumHours: toField(rate?.minimumHours),
  });
  const { mutate: save, isPending } = useSetCharterRate();
  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const dirty =
    form.hourlyRate !== toField(rate?.hourlyRate) ||
    form.averageSpeedKnots !== toField(rate?.averageSpeedKnots) ||
    form.typicalSeats !== toField(rate?.typicalSeats) ||
    form.minimumHours !== toField(rate?.minimumHours);

  const submit = (e) => {
    e.preventDefault();
    // `editing: true` — a blank box clears the stored figure rather than
    // leaving it alone, which is what emptying a rate means.
    const opts = { editing: true };
    save({
      category: rate?.category,
      hourlyRate: optionalNumber(form.hourlyRate, opts),
      averageSpeedKnots: optionalNumber(form.averageSpeedKnots, opts),
      typicalSeats: optionalNumber(form.typicalSeats, opts),
      minimumHours: optionalNumber(form.minimumHours, opts),
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 p-3 rounded-md border border-input">
      <span className="font-montserrat font-semibold text-[13px] text-foreground">
        {formatAircraftCategory(rate?.category)}
      </span>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
        <label className="flex flex-col gap-1 font-montserrat text-[11px] text-muted-foreground">
          $ per hour
          <input type="number" min="1" value={form.hourlyRate} onChange={set("hourlyRate")} placeholder="e.g. 4500" className={INPUT_CLASS} />
        </label>
        <label className="flex flex-col gap-1 font-montserrat text-[11px] text-muted-foreground">
          Avg speed (kt)
          <input type="number" min="50" max="800" value={form.averageSpeedKnots} onChange={set("averageSpeedKnots")} placeholder="e.g. 420" className={INPUT_CLASS} />
        </label>
        <label className="flex flex-col gap-1 font-montserrat text-[11px] text-muted-foreground">
          Typical seats
          <input type="number" min="1" max="100" value={form.typicalSeats} onChange={set("typicalSeats")} placeholder="e.g. 8" className={INPUT_CLASS} />
        </label>
        <label className="flex flex-col gap-1 font-montserrat text-[11px] text-muted-foreground">
          Min hours (Optional)
          <input type="number" min="0" max="24" step="0.5" value={form.minimumHours} onChange={set("minimumHours")} placeholder="e.g. 1.5" className={INPUT_CLASS} />
        </label>
        <Button type="submit" size="sm" className="h-9 col-span-2 sm:col-span-1" disabled={!dirty || isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : "Save"}
        </Button>
      </div>
    </form>
  );
}
