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

  // "…" while loading; a dash if the counts did not arrive — never a 0 the
  // API did not send.
  const count = (value) => (isPending ? "…" : (value ?? "—"));

  const stats = [
    { label: "TOTAL AIRPORTS", value: count(data?.total) },
    {
      label: data?.homeCountry ? `DOMESTIC (${data.homeCountry})` : "DOMESTIC",
      value: count(data?.domestic),
    },
    { label: "INTERNATIONAL", value: count(data?.international), tone: "purple" },
    { label: "WITH ASSIGNED FBO", value: count(data?.withAssignedFbo), tone: "success" },
  ];

  return (
    <div className="flex flex-col gap-6 px-4 sm:px-6 py-6 pb-8">
      <SimpleStatsRow stats={stats} />
      <AirportsContainer />
    </div>
  );
}
