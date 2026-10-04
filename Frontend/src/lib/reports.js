import { formatMoney } from "@/lib/money";
import { toISODate } from "@/lib/date";

/**
 * Reports (#23): which days a report covers, and how the API's figures read
 * on screen. Every figure comes from `/reports/*`; nothing here computes one.
 *
 * Revenue, profit, margin and trips count by the day a trip departs; FET and
 * cash collected by the day a payment arrived; outstanding AR/AP as of today.
 * The API decides that — this file only labels it.
 */

const DASH = "—";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTHS_SHORT = MONTHS.map((month) => month.slice(0, 3));

// ---- The window --------------------------------------------------------

/** The period tabs, in the API's vocabulary; each is the whole calendar period around today. */
export const REPORT_PERIODS = ["TODAY", "WEEK", "MONTH", "YEAR"];
export const DEFAULT_REPORT_PERIOD = "WEEK";

export const REPORT_PERIOD_LABELS = {
  TODAY: "Today",
  WEEK: "This Week",
  MONTH: "This Month",
  YEAR: "This Year",
};

/** A picked month ("2026-08"), quarter ("2026-Q3") or year to date ("2026-YTD"). */
const RANGE_PATTERN = /^(\d{4})-(0[1-9]|1[0-2]|Q[1-4]|YTD)$/;

export function isReportRange(value) {
  return RANGE_PATTERN.test(String(value ?? ""));
}

const day = (year, month, date) => new Date(year, month, date);

/** The first and last day of a picked range, both included. */
function rangeDays(range, today) {
  const [, yearText, part] = RANGE_PATTERN.exec(range);
  const year = Number(yearText);
  if (part === "YTD") return { from: day(year, 0, 1), to: today.getFullYear() === year ? today : day(year, 11, 31) };
  if (part.startsWith("Q")) {
    const first = (Number(part.slice(1)) - 1) * 3;
    return { from: day(year, first, 1), to: day(year, first + 3, 0) };
  }
  const month = Number(part) - 1;
  return { from: day(year, month, 1), to: day(year, month + 1, 0) };
}

/** The first and last day of a period tab around `today`, both included. A week starts on Monday. */
function periodDays(period, today) {
  const year = today.getFullYear();
  const month = today.getMonth();
  const date = today.getDate();
  switch (period) {
    case "TODAY":
      return { from: today, to: today };
    case "MONTH":
      return { from: day(year, month, 1), to: day(year, month + 1, 0) };
    case "YEAR":
      return { from: day(year, 0, 1), to: day(year, 11, 31) };
    case "WEEK":
    default: {
      const monday = date - ((today.getDay() + 6) % 7);
      return { from: day(year, month, monday), to: day(year, month, monday + 6) };
    }
  }
}

/**
 * What the API is asked for: `{ from, to }` as YYYY-MM-DD, both included.
 * A picked range wins over the period tab. Worked out from the desk's own
 * today, so New York at 9pm on the 30th is still asking about the 30th.
 */
export function reportWindow({ period, range }, today = new Date()) {
  const days = isReportRange(range) ? rangeDays(range, today) : periodDays(period, today);
  return { from: toISODate(days.from), to: toISODate(days.to) };
}

export function rangeLabel(range) {
  if (!isReportRange(range)) return null;
  const [, year, part] = RANGE_PATTERN.exec(range);
  if (part === "YTD") return `YTD ${year}`;
  if (part.startsWith("Q")) return `${part} ${year}`;
  return `${MONTHS[Number(part) - 1]} ${year}`;
}

/** The picker: this month and the two before it, this quarter and the one before it, and year to date. */
export function reportRangeOptions(today = new Date()) {
  const year = today.getFullYear();
  const month = today.getMonth();
  const options = [];
  for (let back = 0; back < 3; back += 1) {
    const at = day(year, month - back, 1);
    options.push(`${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}`);
  }
  const quarter = Math.floor(month / 3);
  options.push(`${year}-Q${quarter + 1}`);
  options.push(quarter === 0 ? `${year - 1}-Q4` : `${year}-Q${quarter}`);
  options.push(`${year}-YTD`);
  return options.map((value) => ({ value, label: rangeLabel(value) }));
}

// ---- The charts --------------------------------------------------------

export const SERIES_BUCKETS = ["WEEK", "MONTH", "YEAR"];
export const DEFAULT_SERIES_BUCKET = "MONTH";
export const SERIES_BUCKET_LABELS = { WEEK: "Weekly", MONTH: "Monthly", YEAR: "Yearly" };
/** For a chart title: "REVENUE & PROFIT BY MONTH". */
export const SERIES_BUCKET_NOUNS = { WEEK: "Week", MONTH: "Month", YEAR: "Year" };

/** A bucket's label from its first day: "Sep 28" for a week, "Sep" for a month, "2026" for a year. */
function pointLabel(start, bucket) {
  const [year, month, date] = String(start).split("-").map(Number);
  if (bucket === "YEAR") return String(year);
  if (bucket === "MONTH") return MONTHS_SHORT[month - 1];
  return `${MONTHS_SHORT[month - 1]} ${date}`;
}

/** Chart points. Profit is the API's — over trips whose operator cost is known. */
export function toChartPoints(series) {
  return (series?.points ?? []).map((point) => ({
    label: pointLabel(point?.start, series?.bucket),
    revenue: point?.revenue ?? 0,
    profit: point?.profit ?? 0,
    trips: point?.tripCount ?? 0,
  }));
}

// ---- Tiles and the summary ---------------------------------------------

const percent = (value) => (value === null || value === undefined ? DASH : `${Number(value).toFixed(1)}%`);

export function toReportTiles(summary) {
  if (!summary) return [];
  return [
    { label: "TOTAL REVENUE", value: formatMoney(summary?.revenue), tone: "success" },
    { label: "TOTAL PROFIT", value: formatMoney(summary?.profit), tone: "info" },
    { label: "FET COLLECTED", value: formatMoney(summary?.collected?.fet), tone: "purple" },
    { label: "TOTAL TRIPS", value: String(summary?.tripCount ?? DASH), tone: "warning" },
  ];
}

export function toFinancialSummary(summary) {
  if (!summary) return [];
  return [
    { label: "Total Revenue", value: formatMoney(summary?.revenue), tone: "success" },
    { label: "Total FET Collected", value: formatMoney(summary?.collected?.fet), tone: "info" },
    { label: "Cash Collected", value: formatMoney(summary?.collected?.cash), tone: "success" },
    { label: "Total Profit", value: formatMoney(summary?.profit), tone: "purple" },
    { label: "Profit Margin", value: percent(summary?.marginPercentage), tone: "foreground" },
    { label: "Avg Revenue / Trip", value: formatMoney(summary?.averageRevenue), tone: "foreground" },
    { label: "Avg Profit / Trip", value: formatMoney(summary?.averageProfit), tone: "foreground" },
    { label: "Outstanding AR", value: formatMoney(summary?.outstanding?.receivables), tone: "destructive" },
    { label: "Outstanding AP", value: formatMoney(summary?.outstanding?.payables), tone: "warning" },
  ];
}

/**
 * What the summary's figures leave out, said once under the panel rather
 * than hidden: trips with no price add nothing to revenue, and profit
 * covers only trips whose operator cost is known.
 */
export function summaryCaveats(summary) {
  if (!summary) return [];
  const notes = [];
  const unpriced = (summary?.tripCount ?? 0) - (summary?.pricedCount ?? 0);
  if (unpriced > 0) notes.push(`${unpriced} trip${unpriced === 1 ? "" : "s"} not priced yet — not in revenue.`);
  const noCost = (summary?.pricedCount ?? 0) - (summary?.profitTripCount ?? 0);
  if (noCost > 0) notes.push(`${noCost} trip${noCost === 1 ? "" : "s"} without an operator cost — not in profit.`);
  return notes;
}

// ---- The rankings ------------------------------------------------------

const personName = (person) => `${person?.firstName ?? ""} ${person?.lastName ?? ""}`.trim();

const clientName = (client) =>
  `${client?.firstName ?? ""} ${client?.lastName ?? ""}`.trim() || client?.companyName || DASH;

const airportCode = (airport) => airport?.icao || airport?.iata || DASH;

const figures = (row) => ({
  trips: row?.tripCount ?? 0,
  revenue: formatMoney(row?.revenue),
  profit: formatMoney(row?.profit),
  margin: percent(row?.marginPercentage),
});

export function toBrokerRows(rows) {
  return (rows ?? []).map((row) => ({
    id: row?.broker?.id ?? "unassigned",
    // A trip nobody is assigned is said to be, never credited to someone.
    broker: row?.broker ? personName(row.broker) || DASH : "Unassigned",
    ...figures(row),
  }));
}

export function toClientRows(rows) {
  return (rows ?? []).map((row) => ({ id: row?.client?.id, client: clientName(row?.client), ...figures(row) }));
}

export function toRouteRows(rows) {
  return (rows ?? []).map((row) => ({
    id: `${row?.origin?.id}-${row?.destination?.id}`,
    from: airportCode(row?.origin),
    to: airportCode(row?.destination),
    ...figures(row),
  }));
}

// ---- Export ------------------------------------------------------------

/** The formats the API can write. PDF waits on a PDF generator (MODULE_FEATURE_STATUS.md). */
export const EXPORT_FORMATS = ["CSV", "XLSX"];
export const EXPORT_FORMAT_LABELS = { CSV: "CSV", XLSX: "Excel" };
