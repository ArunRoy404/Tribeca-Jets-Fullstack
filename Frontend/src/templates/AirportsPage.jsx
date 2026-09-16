"use client";

import SimpleStatsRow from "@/components/common/SimpleStatsRow";
import AirportsContainer from "@/components/table/airports/AirportsContainer";
import { useAirportStats } from "@/hooks/airports";

/**
 * Tiles are built from the API's counts rather than a static array.
 *
 * `homeCountry` comes back with them and is rendered into the labels, because
 * "domestic" means nothing without saying relative to where — and hardcoding
 * "USA" in the UI would quietly lie the day the desk opens a second office.
 */
export default function AirportsPage() {
  const { data, isPending } = useAirportStats();

  const stats = [
    { label: "TOTAL AIRPORTS", value: isPending ? "…" : (data?.total ?? 0) },
    {
      label: data?.homeCountry ? `DOMESTIC (${data.homeCountry})` : "DOMESTIC",
      value: isPending ? "…" : (data?.domestic ?? 0),
    },
    {
      label: "INTERNATIONAL",
      value: isPending ? "…" : (data?.international ?? 0),
      tone: "purple",
    },
    {
      label: "WITH ASSIGNED FBO",
      value: isPending ? "…" : (data?.withAssignedFbo ?? 0),
      tone: "success",
    },
  ];

  return (
    <div className="flex flex-col gap-6 px-4 sm:px-6 py-6 pb-8">
      <SimpleStatsRow stats={stats} />
      <AirportsContainer />
    </div>
  );
}
