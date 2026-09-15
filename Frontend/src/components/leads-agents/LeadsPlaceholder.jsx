"use client";

import { UserCheck } from "lucide-react";
import { useLeadsAgentsStore } from "@/store/useLeadsAgentsStore";

export default function LeadsPlaceholder() {
  const setActiveMainTab = useLeadsAgentsStore((s) => s.setActiveMainTab);

  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white/70 backdrop-blur-md rounded-lg border border-border gap-4 my-6 w-full">
      <div className="size-12 rounded-full bg-purple/10 flex items-center justify-center text-purple">
        <UserCheck className="size-6" />
      </div>
      <div className="flex flex-col gap-1 max-w-md">
        <h3 className="font-montserrat font-bold text-[16px] text-foreground">
          Leads Management
        </h3>
        <p className="font-montserrat text-[13px] text-muted-foreground">
          Incoming prospects, broker ownership, and lead tracking pipelines will be configured in the next phase.
        </p>
      </div>
      <button
        type="button"
        onClick={() => setActiveMainTab("agents")}
        className="mt-2 bg-foreground text-background hover:bg-foreground/90 font-montserrat text-[13px] font-medium px-4 py-2 rounded-md transition-colors cursor-pointer"
      >
        View Agents Tab
      </button>
    </div>
  );
}

