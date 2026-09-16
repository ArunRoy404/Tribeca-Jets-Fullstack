"use client";

import { History } from "lucide-react";

/**
 * Awaiting the activity timeline module.
 *
 * This rendered a hardcoded array of events naming people and trips that do
 * not exist. The backend writes real `AuditLog` rows already, but nothing
 * exposes them per record yet — so this says so rather than inventing a
 * history that would read as fact.
 */
export default function ClientActivityTab() {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-md border border-border w-full">
      <History className="size-10 text-muted-foreground/50 mb-3" />
      <p className="font-montserrat font-bold text-[16px] text-foreground">No Activity Yet</p>
      <p className="font-montserrat text-[13px] text-muted-foreground mt-1">
        Quotes, trips, payments and follow-ups for this client will appear here.
      </p>
    </div>
  );
}
