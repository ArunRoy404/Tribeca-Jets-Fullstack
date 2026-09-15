"use client";

import SimpleStatsRow from "@/components/common/SimpleStatsRow";
import OperatorsContainer from "@/components/table/operators/OperatorsContainer";
import { useOperatorStats } from "@/hooks/operators";

/**
 * Tiles are built from the API's counts rather than a static array.
 *
 * "TOTAL FLEET" counts aircraft, which the Aircraft module will own — the API
 * returns null for it today, and it renders as an em dash rather than a
 * confident zero for a desk that demonstrably flies these operators.
 */
export default function OperatorsPage() {
  const { data, isPending } = useOperatorStats();

  const show = (value) => {
    if (isPending) return "…";
    return value === null || value === undefined ? "—" : value;
  };

  const stats = [
    { label: "TOTAL OPERATORS", value: show(data?.total) },
    { label: "ACTIVE", value: show(data?.active), highlight: "success" },
    { label: "PREFERRED", value: show(data?.preferred), highlight: "purple" },
    { label: "TOTAL FLEET", value: show(data?.totalFleet) },
  ];

  return (
    <div className="flex flex-col gap-6 px-4 sm:px-6 py-6 pb-8">
      <SimpleStatsRow stats={stats} />
      <OperatorsContainer />
    </div>
  );
}
