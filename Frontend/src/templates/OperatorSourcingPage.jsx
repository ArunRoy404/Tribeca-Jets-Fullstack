"use client";

import SimpleStatsRow from "@/components/common/SimpleStatsRow";
import OperatorSourcingContainer from "@/components/table/operator-sourcing/OperatorSourcingContainer";
import SourcingRequestDetailSheet from "@/components/operator-sourcing/SourcingRequestDetailSheet";
import NewSourcingRequestDialog from "@/components/operator-sourcing/NewSourcingRequestDialog";
import RequestOperatorQuoteDialog from "@/components/operator-sourcing/RequestOperatorQuoteDialog";
import { useOperatorQuoteStats } from "@/hooks/operator-quotes";
import { useTripRequestStats } from "@/hooks/trip-requests";
import { formatResponseTime } from "@/lib/sourcing";

/**
 * The tiles above the sourcing board.
 *
 * Every figure is counted by the API from real quotes. `averageResponseHours`
 * arrives **null, not 0**, when nothing has been answered — a desk that has
 * just started sourcing has no response time, and "0h" would read as every
 * operator replying instantly.
 */
function useSourcingStats() {
  const { data: quotes } = useOperatorQuoteStats();
  const { data: requests } = useTripRequestStats();

  return [
    {
      label: "OPEN REQUESTS",
      value: requests?.open ?? "—",
      tone: "foreground",
    },
    {
      label: "AWAITING RESPONSE",
      value: quotes?.awaitingResponse ?? "—",
      tone: "info",
    },
    {
      label: "QUOTES RECEIVED",
      value: quotes?.received ?? "—",
      tone: "purple",
    },
    {
      label: "AVG RESPONSE TIME",
      value: formatResponseTime(quotes?.averageResponseHours),
      tone: "foreground",
    },
    {
      label: "SOURCED",
      value: quotes?.approved ?? "—",
      tone: "success",
    },
  ];
}

export default function OperatorSourcingPage() {
  const stats = useSourcingStats();

  return (
    <>
      <div className="flex flex-col gap-6 px-4 sm:px-6 py-6 pb-8">
        <SimpleStatsRow stats={stats} />
        <OperatorSourcingContainer />
      </div>

      <SourcingRequestDetailSheet />
      <NewSourcingRequestDialog />
      <RequestOperatorQuoteDialog />
    </>
  );
}
