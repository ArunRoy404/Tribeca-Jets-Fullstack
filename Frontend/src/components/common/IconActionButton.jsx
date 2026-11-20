"use client";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * A square icon button the height of an input (`h-10`), so it sits flush
 * beside one. `label` is both the tooltip and the accessible name — an icon
 * alone says nothing to a screen reader.
 */
const TONES = {
  neutral: "border-border bg-white text-foreground hover:bg-muted",
  primary: "border-purple/30 bg-purple/10 text-purple hover:bg-purple/15",
  success: "border-success/30 bg-success/10 text-success hover:bg-success/15",
  destructive: "border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/15",
};

export default function IconActionButton({ icon: Icon, label, tone = "neutral", className, ...props }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="outline"
            aria-label={label}
            className={cn("size-10 shrink-0 rounded-md p-0 shadow-none", TONES[tone], className)}
            {...props}
          />
        }
      >
        <Icon className="size-4" aria-hidden="true" />
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
