"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export default function CommonInput({
  type = "text",
  label,
  name,
  placeholder,
  className,
  ...props
}) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";
  const isTextarea = type === "textarea";

  return (
    <div className="flex w-full flex-col gap-2">
      {label && (
        <Label htmlFor={name} className="font-montserrat text-base font-medium text-foreground">
          {label}
        </Label>
      )}

      {isTextarea ? (
        <Textarea id={name} name={name} placeholder={placeholder} className={className} {...props} />
      ) : isPassword ? (
        <div className="relative">
          <Input
            id={name}
            name={name}
            type={visible ? "text" : "password"}
            placeholder={placeholder}
            className={cn("pr-11", className)}
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Hide password" : "Show password"}
            className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground"
          >
            {visible ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        </div>
      ) : (
        <Input id={name} name={name} type={type} placeholder={placeholder} className={className} {...props} />
      )}
    </div>
  );
}
