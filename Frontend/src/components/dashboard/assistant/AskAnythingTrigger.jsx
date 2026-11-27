import Image from "next/image";
import { PopoverTrigger } from "@/components/ui/popover";

export default function AskAnythingTrigger() {
  return (
    <PopoverTrigger
      aria-label="Ask Anything AI Assistant (Press Cmd+K or Ctrl+K)"
      className="h-9 sm:h-11 shrink-0 border border-purple flex gap-2 items-center justify-center px-2 sm:px-3 rounded-md cursor-pointer outline-none hover:bg-white/10 transition-colors text-white"
    >
      <Image src="/dashboard/icons/sparkle.svg" alt="" width={18} height={18} />
      <span className="hidden sm:inline font-montserrat font-semibold text-[13px] whitespace-nowrap">Ask AI</span>
    </PopoverTrigger>
  );
}
