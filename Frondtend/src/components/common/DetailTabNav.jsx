"use client";

import { cn } from "@/lib/utils";

export default function DetailTabNav({ tabs, activeTab, onTabChange, className }) {
  return (
    <div className={cn("flex items-center gap-1 border-b border-border pb-1 overflow-x-auto w-full", className)}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "px-4 py-2.5 font-montserrat text-[13px] font-bold transition-all relative flex items-center gap-1.5 whitespace-nowrap cursor-pointer",
              isActive
                ? "text-purple border-b-2 border-purple"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={cn(
                  "size-5 rounded-full text-[10px] font-bold flex items-center justify-center border",
                  isActive
                    ? "bg-purple text-white border-purple"
                    : "bg-secondary text-muted-foreground border-border"
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
