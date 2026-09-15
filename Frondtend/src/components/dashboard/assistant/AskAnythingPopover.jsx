"use client";

import { useState } from "react";
import { Popover, PopoverContent } from "@/components/ui/popover";
import StaggerContainer from "@/components/common/StaggerContainer";
import StaggerItem from "@/components/common/StaggerItem";
import AskAnythingTrigger from "./AskAnythingTrigger";
import AssistantHeader from "./AssistantHeader";
import AssistantHero from "./AssistantHero";
import AssistantSuggestionItem from "./AssistantSuggestionItem";
import AssistantInputBar from "./AssistantInputBar";
import { useAssistantStore } from "@/store/useAssistantStore";

export default function AskAnythingPopover() {
  const [open, setOpen] = useState(false);
  const suggestions = useAssistantStore((s) => s.suggestions);
  const message = useAssistantStore((s) => s.message);
  const setMessage = useAssistantStore((s) => s.setMessage);

  const handleSend = (text) => {
    if (!text?.trim()) return;
    alert(`Assistant message sent: "${text}"`);
    setMessage?.("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <AskAnythingTrigger />

      <PopoverContent
        side="top"
        align="end"
        sideOffset={12}
        className="w-[calc(100vw-2rem)] sm:w-[420px] gap-0 overflow-hidden rounded-md p-0 z-50"
      >
        <AssistantHeader onClose={() => setOpen(false)} />

        <div className="flex flex-col gap-6 items-center justify-center px-6 py-4 w-full">
          <AssistantHero />

          <StaggerContainer stagger={0.06} delay={0.05} className="flex flex-col gap-2.5 items-start w-full">
            {suggestions?.map((s) => (
              <StaggerItem key={s} className="w-full">
                <AssistantSuggestionItem
                  suggestion={s}
                  onClick={(suggestionText) => setMessage?.(suggestionText)}
                />
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>

        <AssistantInputBar
          message={message}
          setMessage={setMessage}
          onSubmit={handleSend}
        />
      </PopoverContent>
    </Popover>
  );
}
