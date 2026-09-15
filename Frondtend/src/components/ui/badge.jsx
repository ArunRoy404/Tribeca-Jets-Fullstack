import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap border font-montserrat font-medium transition-all [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      tone: {
        neutral: "border-transparent bg-primary text-primary-foreground",
        purple: "border-transparent bg-purple/10 text-purple",
        success: "border-transparent bg-success/10 text-success",
        warning: "border-transparent bg-warning/10 text-warning",
        info: "border-transparent bg-info/10 text-info",
        infoStrong: "border-transparent bg-info/20 text-info",
        cyan: "border-transparent bg-cyan/10 text-cyan",
        destructive: "border-transparent bg-destructive/20 text-destructive",
        pending: "border-pending-border bg-pending-bg text-pending-fg",
        outline: "border-border bg-transparent text-foreground",
      },
      size: {
        sm: "rounded-sm px-2 py-1 text-xs",
        trend: "rounded-lg px-2 py-1 text-[10px]",
      },
    },
    defaultVariants: {
      tone: "neutral",
      size: "sm",
    },
  }
)

function Badge({
  className,
  tone = "neutral",
  size = "sm",
  render,
  ...props
}) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps({
      className: cn(badgeVariants({ tone, size }), className),
    }, props),
    render,
    state: {
      slot: "badge",
      tone,
    },
  });
}

export { Badge, badgeVariants }
