"use client";

import BrandLogo from "@/components/common/BrandLogo";
import { useBranding } from "@/hooks/settings";
import { cn } from "@/lib/utils";

/**
 * The company's branding block every document-style panel opens with —
 * every detail sheet via `DetailSheet`, and anywhere else a panel renders
 * outside a Sheet (the Build Itinerary live preview). Kept separate from
 * `DetailSheet` so both call sites share one copy instead of two.
 *
 * Everything in it comes from Settings › Company & Branding through the
 * public branding. The logo always shows. The corner is the company's
 * contact block and is **all or nothing** (owner's rule, 7 Oct 2026): with
 * "Show company contact block" on, the name, website, email, phone and
 * address — whichever are filled in; with it off, nothing.
 */
export default function TribecaLetterhead({ className }) {
  const { data: branding } = useBranding();
  // `contact` is null while the company hides its contact block.
  const contact = branding?.contact;
  const lines = contact
    ? [branding.companyName, contact.website, contact.email, contact.phone, contact.address].filter(Boolean)
    : [];

  return (
    <div className={cn("flex items-start justify-between border-b border-border pb-4 pr-8 w-full", className)}>
      <BrandLogo tone="dark" width={80} height={48} className="h-12 w-auto" />
      {lines.length ? (
        <div className="flex flex-col items-end text-right text-[11px] font-montserrat text-muted-foreground">
          {lines.map((line, index) => (
            <p key={line} className={index === 0 ? "font-semibold text-foreground" : undefined}>
              {line}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
