import Image from "next/image";
import { PopoverTrigger } from "@/components/ui/popover";

export default function AskAnythingTrigger() {
  return (
    <PopoverTrigger
      aria-label="Ask Anything AI Assistant (Press Cmd+K or Ctrl+K)"
      className="fixed bottom-8 right-8 z-20 bg-sidebar border border-purple flex gap-2.5 items-center px-4 py-3.5 sm:py-4 rounded-full cursor-pointer shadow-glow-purple outline-none hover:opacity-95 transition-all group"
    >
      <Image src="/dashboard/icons/sparkle.svg" alt="" width={24} height={24} />
      <span
        className="font-montserrat font-bold text-[15px] sm:text-[16px] text-white whitespace-nowrap"
        style={{ textShadow: "0px 4px 4px rgba(180,79,243,0.69)" }}
      >
        Ask Anything
      </span>
      <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium text-white/70 bg-white/10 rounded border border-white/20">
        ⌘K
      </kbd>
    </PopoverTrigger>
  );
}
