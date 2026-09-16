import StatCard from "@/components/common/StatCard";

/**
 * Client Stats KPI Row
 *
 * API Integration Guidelines:
 * - Next Follow-up is wired to the active Client entity (client.nextFollowUpLabel, client.followUpWindowLabel).
 * - Total Trips, Total Spent, and Active Quotes are aggregates over Trips, Quotes, and Invoices.
 *   These modules have not landed yet. When those services ship, wire their API aggregates here:
 *   - Total Trips: GET /api/trips?clientId={clientId} (meta.total & completed count)
 *   - Total Spent: GET /api/invoices/client-summary?clientId={clientId} (sum of paid invoices)
 *   - Active Quotes: GET /api/quotes?clientId={clientId}&status=SENT (meta.total)
 *   Until then, render honest em dashes per project agreement ("never display a number the data did not supply").
 */
export default function ClientStatsRow({ client }) {
  const totalTrips = client?.totalTrips ?? "—";
  const tripsOnRecord = client?.tripsOnRecord ?? "—";
  const totalSpent = client?.totalSpent ?? "—";
  const activeQuotes = client?.activeQuotesCount ?? "—";
  const nextFollowUp =
    client?.nextFollowUpLabel && client?.nextFollowUpLabel !== "—"
      ? client.nextFollowUpLabel
      : "—";
  const followUpStatus =
    client?.followUpWindowLabel &&
    client?.followUpWindowLabel !== "—" &&
    client?.followUpWindowLabel !== ""
      ? client.followUpWindowLabel
      : "—";

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full">
      <StatCard
        title="TOTAL TRIPS"
        value={totalTrips}
        subtitle={tripsOnRecord}
      />
      <StatCard
        title="TOTAL SPENT"
        value={totalSpent}
        subtitle="all time"
        valueTone="success"
      />
      <StatCard
        title="ACTIVE QUOTES"
        value={activeQuotes}
        subtitle="awaiting response"
        valueTone="destructive"
      />
      <StatCard
        title="NEXT FOLLOW-UP"
        value={nextFollowUp}
        subtitle={followUpStatus}
        valueTone="warning"
      />
    </div>
  );
}
