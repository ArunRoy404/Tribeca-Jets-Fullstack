"use client";

import { InputOTP, InputOTPSlot } from "@/components/ui/input-otp";
import { cn } from "@/lib/utils";

export default function CommonOTPInput({ length = 6, fixedWidth = false, value, onChange, ...props }) {
  return (
    <InputOTP
      maxLength={length}
      value={value}
      onChange={onChange}
      containerClassName="gap-4 w-full"
      {...props}
    >
      {Array.from({ length }).map((_, i) => (
        <InputOTPSlot
          key={i}
          index={i}
          className={cn(
            "h-13 rounded-sm border border-input bg-white font-montserrat text-base font-medium text-foreground first:rounded-sm last:rounded-sm data-[active=true]:border-ring data-[active=true]:ring-3 data-[active=true]:ring-ring/50",
            fixedWidth ? "flex-1 min-w-0 sm:w-[62px] sm:flex-none sm:shrink-0" : "flex-1 min-w-0"
          )}
        />
      ))}
    </InputOTP>
  );
}
