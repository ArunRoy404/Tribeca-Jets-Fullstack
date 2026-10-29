"use client";

import Image from "next/image";
import { RotateCcw } from "lucide-react";
import { useBranding } from "@/hooks/settings";

export default function AssistantHeader({ title, context = "Dashboard", hasTurns = false, onReset, onClose }) {
  // Named after the company in Settings unless a caller names it.
  const { data: branding } = useBranding();
  const heading = title ?? (branding?.companyName ? `${branding.companyName} Assistant` : "Assistant");
  return (
    <div className="bg-sidebar flex gap-4 items-center p-4 w-full">
      <div className="relative overflow-hidden rounded-full shrink-0 size-12">
        <Image src="/dashboard/icons/assistant-avatar.svg" alt="" fill className="object-cover" />
      </div>
      <div className="flex flex-1 flex-col gap-1 min-w-0">
        <p className="font-montserrat font-bold text-[16px] text-white whitespace-nowrap truncate">{heading}</p>
        <p className="font-montserrat font-medium text-[12px] text-border truncate">Context: {context}</p>
      </div>
      {hasTurns && (
        <button
          type="button"
          onClick={onReset}
          title="Clear conversation"
          className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-montserrat text-white/80 hover:text-white hover:bg-white/10 cursor-pointer shrink-0 transition-colors"
        >
          <RotateCcw className="size-3.5" />
          <span>Reset</span>
        </button>
      )}
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
