"use client";

import { useSettingsParams } from "@/hooks/settings";
import { sectionById } from "@/lib/settings";
import SettingsNav from "@/components/settings/SettingsNav";
import CompanyBrandingSection from "@/components/settings/sections/CompanyBrandingSection";
import QuoteDefaultsSection from "@/components/settings/sections/QuoteDefaultsSection";
import SecuritySection from "@/components/settings/sections/SecuritySection";
import NotificationsSection from "@/components/settings/sections/NotificationsSection";
import IntegrationsSection from "@/components/settings/sections/IntegrationsSection";
import DataSection from "@/components/settings/sections/DataSection";

const SECTIONS = {
  company: CompanyBrandingSection,
  defaults: QuoteDefaultsSection,
  security: SecuritySection,
  notifications: NotificationsSection,
  integrations: IntegrationsSection,
  data: DataSection,
};

export default function SettingsPage() {
  const { section, setSection } = useSettingsParams();
  const current = sectionById(section);
  const Section = SECTIONS[current.id];

  return (
    <div className="flex flex-col gap-6 w-full min-h-full bg-surface px-4 pt-4 pb-6 sm:px-6 sm:pt-6 lg:px-10 lg:pt-8 lg:pb-10">
      <div className="flex flex-col gap-1.5">
        <h2 className="font-montserrat font-bold text-[22px] sm:text-[28px] leading-normal text-foreground">
          {current.title}
        </h2>
        <p className="font-montserrat text-[13px] leading-normal text-muted-foreground">{current.subtitle}</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 items-start w-full">
        <SettingsNav value={current.id} onChange={setSection} />
        <div key={current.id} className="flex flex-1 flex-col gap-5 min-w-0 w-full">
          <Section />
        </div>
      </div>
    </div>
  );
}
