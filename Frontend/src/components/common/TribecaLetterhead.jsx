import Logo from "@/components/common/Logo";
import { cn } from "@/lib/utils";

/**
 * The Tribeca Jets branding block every document-style panel opens with —
 * every detail sheet via `DetailSheet`, and anywhere else a panel renders
 * outside a Sheet (the Build Itinerary live preview). Kept separate from
 * `DetailSheet` so both call sites share one copy instead of two.
 */
export default function TribecaLetterhead({ className }) {
  return (
    <div className={cn("flex items-start justify-between border-b border-border pb-4 pr-8 w-full", className)}>
      <Logo variant="black" className="h-12 w-auto" />
      <div className="flex flex-col items-end text-[11px] font-montserrat text-muted-foreground">
        <p className="font-semibold text-foreground">Tribeca Jets</p>
        <p>www.tribecajets.com</p>
        <p>fly@tribecajets.com</p>
      </div>
    </div>
  );
}
