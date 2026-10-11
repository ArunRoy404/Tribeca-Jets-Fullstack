"use client";

import { QUICK_LINKS } from "@/lib/settings";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import SettingsCard from "../SettingsCard";
import SettingRow from "../SettingRow";

/**
 * Quick links only. A row appears here when its service actually exists, so
 * there is no "Connected" badge that nothing measured. Gmail, Google
 * Calendar, cloud storage, weather, the flight-tracking API and the API &
 * webhooks panel are logged as waiting (MODULE_FEATURE_STATUS.md, Settings).
 */
export default function IntegrationsSection() {
  return (
    <SettingsCard title="Quick links" description="Open the desk's other tools in a new tab.">
      {QUICK_LINKS.map((link) => (
        <SettingRow
          key={link.id}
          label={link.name}
          description={link.description}
          action={
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-auto rounded-sm px-4 py-2.5 text-[14px] leading-normal shadow-none"
              )}
            >
              Open
            </a>
          }
        />
      ))}
    </SettingsCard>
  );
}
