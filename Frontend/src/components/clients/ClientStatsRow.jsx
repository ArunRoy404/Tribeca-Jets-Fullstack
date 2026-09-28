import StatCard from "@/components/common/StatCard";
import { useTrips } from "@/hooks/trips";
import { useReceivableStats } from "@/hooks/receivables";
import { usePermissions } from "@/hooks/common/usePermissions";
import { Permission } from "@/lib/permissions";
import { formatMoney } from "@/lib/money";

/**
 * Client Stats KPI Row
 *
 * API Integration Guidelines:
 * - Next Follow-up is wired to the active Client entity (client.nextFollowUpLabel, client.followUpWindowLabel).
 * - Total Trips is live since Trips (#11): the count of this client's trips
 *   from `GET /trips?clientId=` (the pager's `meta.total`), within the caller's
 *   scope, and how many of them are completed.
 * - Total Spent is money actually received from this client — every live
 *   payment on the invoices billed to them, summed by the API
 *   (`GET /receivables/stats?clientId=`, Receivables #16). A sum of booked
 *   prices would be a different figure. An em dash for a role that may not
 *   read receivables.
 */
export default function ClientStatsRow({ client }) {
  const { data: allTrips } = useTrips({ clientId: client?.id, limit: 1 }, { enabled: Boolean(client?.id) });
  const { data: completedTrips } = useTrips(
    { clientId: client?.id, status: "COMPLETED", limit: 1 },
    { enabled: Boolean(client?.id) },
  );
  const totalTrips = allTrips?.meta ? String(allTrips.meta.total) : "—";
  const tripsOnRecord = completedTrips?.meta ? `${completedTrips.meta.total} completed` : "—";
  const { can } = usePermissions();
  const maySeeInvoices = can(Permission.VIEW_RECEIVABLES);
  const { data: billing } = useReceivableStats(
    { clientId: client?.id },
    { enabled: Boolean(client?.id) && maySeeInvoices },
  );
  const totalSpent = maySeeInvoices && billing ? formatMoney(billing.collected) : "—";
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
        subtitle="received, all time"
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
