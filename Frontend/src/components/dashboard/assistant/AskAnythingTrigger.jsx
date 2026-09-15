import Image from "next/image";
import { PopoverTrigger } from "@/components/ui/popover";

export default function AskAnythingTrigger() {
  return (
    <PopoverTrigger className="fixed bottom-8 right-8 z-20 bg-sidebar border border-purple flex gap-2.5 items-center px-4 py-4 rounded-full cursor-pointer shadow-glow-purple outline-none hover:opacity-95 transition-opacity">
      <Image src="/dashboard/icons/sparkle.svg" alt="" width={24} height={24} />
      <p
        className="font-montserrat font-bold text-[16px] text-white whitespace-nowrap"
        style={{ textShadow: "0px 4px 4px rgba(180,79,243,0.69)" }}
      >
        Ask Anything
      </p>
    </PopoverTrigger>
  );
}
