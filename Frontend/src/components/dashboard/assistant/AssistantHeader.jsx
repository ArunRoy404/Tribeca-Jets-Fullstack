"use client";

import Image from "next/image";
import { useBranding } from "@/hooks/settings";

export default function AssistantHeader({ title, context = "Dashboard", onClose }) {
  // Named after the company in Settings unless a caller names it.
  const { data: branding } = useBranding();
  const heading = title ?? (branding?.companyName ? `${branding.companyName} Assistant` : "Assistant");
  return (
    <div className="bg-sidebar flex gap-4 items-center p-4 w-full">
      <div className="relative overflow-hidden rounded-full shrink-0 size-12">
        <Image src="/dashboard/icons/assistant-avatar.svg" alt="" fill className="object-cover" />
      </div>
      <div className="flex flex-1 flex-col gap-1 min-w-0">
        <p className="font-montserrat font-bold text-[16px] text-white whitespace-nowrap">{heading}</p>
        <p className="font-montserrat font-medium text-[12px] text-border">Context: {context}</p>
      </div>
      <button
        type="button"
        onClick={(e) => onClose?.(e)}
        className="flex items-center justify-center rounded-full size-6 cursor-pointer shrink-0 hover:opacity-80"
      >
        <Image src="/dashboard/icons/assistant-close.svg" alt="Close" width={16} height={16} />
      </button>
    </div>
  );
}
