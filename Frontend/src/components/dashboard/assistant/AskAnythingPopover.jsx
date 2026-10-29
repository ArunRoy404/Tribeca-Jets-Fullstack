"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { Popover, PopoverContent } from "@/components/ui/popover";
import StaggerContainer from "@/components/common/StaggerContainer";
import StaggerItem from "@/components/common/StaggerItem";
import AskAnythingTrigger from "./AskAnythingTrigger";
import AssistantHeader from "./AssistantHeader";
import AssistantHero from "./AssistantHero";
import AssistantSuggestionItem from "./AssistantSuggestionItem";
import AssistantInputBar from "./AssistantInputBar";
import { useAssistantStore } from "@/store/useAssistantStore";
import { useAskAssistant, useAssistantSuggestions } from "@/hooks/assistant";

function deriveContextLabel(pathname) {
  if (!pathname || pathname === "/dashboard") return "Dashboard";
  const seg = pathname.replace(/^\/dashboard\/?/, "").split("/")[0] || "Dashboard";
  return seg
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function AskAnythingPopover() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const contextLabel = useMemo(() => deriveContextLabel(pathname), [pathname]);

  const message = useAssistantStore((s) => s.message);
  const setMessage = useAssistantStore((s) => s.setMessage);
  const turns = useAssistantStore((s) => s.turns);
  const appendTurn = useAssistantStore((s) => s.appendTurn);
  const clearTurns = useAssistantStore((s) => s.clearTurns);

  const { data: suggestionsData } = useAssistantSuggestions(contextLabel, open);
  const { mutate: askAssistant, isPending } = useAskAssistant();

  const suggestions = suggestionsData?.suggestions ?? [
    "Give me my desk briefing for today",
    "Which quotes are waiting on client approval?",
    "What trips are departing soon?",
    "Which invoices are currently overdue or unpaid?",
  ];

  const handleSend = (text) => {
    const clean = text?.trim();
    if (!clean || isPending) return;
    setMessage("");
    askAssistant(
      { question: clean, context: contextLabel },
      {
        onSuccess: (reply) => {
          appendTurn({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            question: clean,
            reply,
          });
        },
      },
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <AskAnythingTrigger />

      <PopoverContent
        side="top"
        align="end"
        sideOffset={12}
        className="w-[calc(100vw-2rem)] sm:w-[440px] gap-0 overflow-hidden rounded-md p-0 z-50 shadow-xl"
      >
        <AssistantHeader
          context={contextLabel}
          hasTurns={turns.length > 0}
          onReset={clearTurns}
          onClose={() => setOpen(false)}
        />

        {turns.length === 0 ? (
          <div className="flex flex-col gap-5 items-center justify-center px-6 py-5 w-full">
            <AssistantHero subtitle="Ask about your live quotes, trips, invoices, client follow-ups, or CRM workflows." />

            <StaggerContainer stagger={0.05} delay={0.04} className="flex flex-col gap-2 items-start w-full">
              {suggestions.map((s) => (
                <StaggerItem key={s} className="w-full">
                  <AssistantSuggestionItem
                    suggestion={s}
                    onClick={(suggestionText) => handleSend(suggestionText)}
                  />
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        ) : (
          <div className="flex flex-col gap-4 px-5 py-4 max-h-[380px] overflow-y-auto w-full bg-[#FAFAFA]">
            {turns.map((turn) => (
              <div key={turn.id} className="flex flex-col gap-2.5 w-full">
                {/* User Question */}
                <div className="self-end max-w-[85%] bg-sidebar text-white px-3.5 py-2 rounded-md font-montserrat text-[12px] font-medium">
                  {turn.question}
                </div>

                {/* Assistant Answer Card */}
                <div className="bg-white border border-border rounded-md p-3.5 flex flex-col gap-2.5 w-full shadow-xs">
                  <p className="font-montserrat text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
                    {turn.reply?.topic || "Command Center"}
                  </p>
                  <p className="font-montserrat text-[12px] text-foreground leading-relaxed">
                    {turn.reply?.answer}
                  </p>

                  {turn.reply?.items?.length > 0 && (
                    <div className="flex flex-col divide-y divide-border border-t border-border pt-2 mt-0.5">
                      {turn.reply.items.map((item, idx) => (
                        <div key={`${item.label}-${idx}`} className="py-2 first:pt-1 last:pb-0 flex items-start justify-between gap-2">
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <p className="font-montserrat font-semibold text-[12px] text-foreground truncate">
                              {item.label}
                            </p>
                            <p className="font-montserrat text-[11px] text-muted-foreground leading-snug">
                              {item.detail}
                            </p>
                          </div>
                          {item.href && (
                            <Link
                              href={item.href}
                              onClick={() => setOpen(false)}
                              className="inline-flex items-center gap-0.5 text-[11px] font-montserrat font-semibold text-purple hover:underline shrink-0 mt-0.5"
                            >
                              <span>Open</span>
                              <ArrowUpRight className="size-3" />
                            </Link>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {turn.reply?.followUps?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/60">
                      {turn.reply.followUps.map((f) => (
                        <button
                          key={f}
                          type="button"
                          disabled={isPending}
                          onClick={() => handleSend(f)}
                          className="text-left text-[11px] font-montserrat text-muted-foreground hover:text-foreground bg-secondary/60 hover:bg-secondary px-2.5 py-1 rounded-sm border border-border transition-colors cursor-pointer"
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isPending && (
              <div className="text-[11px] font-montserrat text-muted-foreground italic px-1">
                Checking your Command Center records...
              </div>
            )}
          </div>
        )}

        <AssistantInputBar
          message={message}
          setMessage={setMessage}
          onSubmit={handleSend}
        />
      </PopoverContent>
    </Popover>
  );
}
