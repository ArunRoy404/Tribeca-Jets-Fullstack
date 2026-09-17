"use client";

import StatCard from "@/components/common/StatCard";

/**
 * OperatorDetailStats
 *
 * Displays top KPI metric tiles for the Operator.
 * In accordance with the CRM rule: "Never display a number the data did not supply":
 * - Metrics return "—" when data has not been provided or calculated yet.
 * - Total Trips and Total Paid will be supplied by real backend aggregations
 *   once Trips and Operator Payments modules are linked.
 */
export default function OperatorDetailStats({ operator }) {
  if (!operator) return null;

  const reliability = operator.reliability && operator.reliability !== "—" ? operator.reliability : null;
  const safety = operator.safety && operator.safety !== "—" ? operator.safety : "—";
  const responseSpeed = operator.responseSpeed && operator.responseSpeed !== "—" ? operator.responseSpeed : "—";
  const totalTrips = operator.totalTrips && operator.totalTrips !== "—" ? String(operator.totalTrips) : "—";
  const totalPaid = operator.totalPaid && operator.totalPaid !== "—" ? operator.totalPaid : "—";

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 items-stretch justify-center w-full">
      {/* 1. Reliability */}
      <StatCard
        title="RELIABILITY"
        value={
          reliability ? (
            <span className="flex items-center gap-1.5 text-foreground">
              <span className="text-amber-500">★</span>
              <span>{reliability}</span>
            </span>
          ) : (
            "—"
          )
        }
      />

      {/* 2. Safety */}
      <StatCard
        title="SAFETY"
        value={safety}
        valueTone={safety !== "—" ? "success" : "foreground"}
      />

      {/* 3. Response Speed */}
      <StatCard
        title="RESPONSE SPEED"
        value={responseSpeed}
        valueTone={responseSpeed !== "—" ? "destructive" : "foreground"}
      />

      {/* 4. Total Trips */}
      <StatCard
        title="TOTAL TRIPS"
        value={totalTrips}
        valueTone={totalTrips !== "—" ? "purple" : "foreground"}
      />

      {/* 5. Total Paid */}
      <StatCard
        title="TOTAL PAID"
        value={totalPaid}
        valueTone={totalPaid !== "—" ? "success" : "foreground"}
        className="col-span-2 sm:col-span-1"
      />
    </div>
  );
}
