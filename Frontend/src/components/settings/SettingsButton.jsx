import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The settings pages' button: dark for a page's main action (`primary`),
 * outlined for everything else. Taller than the app's default button, as drawn.
 */
export default function SettingsButton({ primary = false, className, ...props }) {
  return (
    <Button
      variant={primary ? "default" : "outline"}
      className={cn("h-auto rounded-sm px-4 py-2.5 text-[14px] leading-normal shadow-none", className)}
      {...props}
    />
  );
}
