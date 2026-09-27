"use client";

import { useMemo } from "react";
import { useClients } from "@/hooks/clients";
import { useUsers } from "@/hooks/users";
import { useAirports } from "@/hooks/airports";
import { useOperators } from "@/hooks/operators";
import { useAircraftList } from "@/hooks/aircraft";
import { displayName } from "@/lib/client";
import { personName } from "@/lib/lead";
import { BROKER_ROLES } from "@/lib/roles";

/**
 * The trip form's pickers, from the API — never the hardcoded name lists the
 * form used to carry. One hook so the six cards share one fetch of each.
 */
export function useTripFormOptions() {
  const { data: clients } = useClients({ limit: 100 });
  const { data: users } = useUsers({ limit: 100 });
  const { data: airports } = useAirports({ limit: 100 });
  const { data: operators } = useOperators({ limit: 100 });
  const { data: aircraft } = useAircraftList({ limit: 100 });

  return useMemo(
    () => ({
      clients: (clients?.data ?? []).map((c) => ({ value: c.id, label: displayName(c) })),
      brokers: (users?.data ?? [])
        .filter((u) => BROKER_ROLES.has(u?.role))
        .map((u) => ({ value: u.id, label: personName(u) })),
      airports: (airports?.data ?? []).map((a) => ({ value: a.id, label: `${a.icao} · ${a.city ?? a.name}` })),
      operators: (operators?.data ?? []).map((o) => ({ value: o.id, label: o.name })),
      aircraft: (aircraft?.data ?? []).map((a) => ({
        value: a.id,
        label: [a.tailNumber, a.model].filter(Boolean).join(" · "),
        operatorId: a.operatorId,
      })),
    }),
    [clients?.data, users?.data, airports?.data, operators?.data, aircraft?.data],
  );
}
