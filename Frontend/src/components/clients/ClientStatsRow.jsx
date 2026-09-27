import StatCard from "@/components/common/StatCard";
import { useTrips } from "@/hooks/trips";

/**
 * Client Stats KPI Row
 *
 * API Integration Guidelines:
 * - Next Follow-up is wired to the active Client entity (client.nextFollowUpLabel, client.followUpWindowLabel).
 * - Total Trips is live since Trips (#11): the count of this client's trips
 *   from `GET /trips?clientId=` (the pager's `meta.total`), within the caller's
 *   scope, and how many of them are completed.
 * - Total Spent needs Receivables (#16) — money actually paid — and stays an
 *   em dash until then; a sum of booked prices would be a different figure.
 */
export default function ClientStatsRow({ client }) {
  const { data: allTrips } = useTrips({ clientId: client?.id, limit: 1 }, { enabled: Boolean(client?.id) });
  const { data: completedTrips } = useTrips(
    { clientId: client?.id, status: "COMPLETED", limit: 1 },
    { enabled: Boolean(client?.id) },
  );
  const totalTrips = allTrips?.meta ? String(allTrips.meta.total) : "—";
  const tripsOnRecord = completedTrips?.meta ? `${completedTrips.meta.total} completed` : "—";
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
