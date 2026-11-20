"use client";

import { useSettingsParams } from "@/hooks/settings";
import { useCurrentUser } from "@/hooks/auth";
import { useState } from "react";
import { useUnsavedChangesGuard } from "@/hooks/common/useUnsavedChangesGuard";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { DEFAULT_SETTINGS_SECTION, sectionById } from "@/lib/settings";
import SettingsNav from "@/components/settings/SettingsNav";
import CompanyBrandingSection from "@/components/settings/sections/CompanyBrandingSection";
import QuoteDefaultsSection from "@/components/settings/sections/QuoteDefaultsSection";
import SecuritySection from "@/components/settings/sections/SecuritySection";
import RateLimitsSection from "@/components/settings/sections/RateLimitsSection";
import NotificationsSection from "@/components/settings/sections/NotificationsSection";
import DataSection from "@/components/settings/sections/DataSection";
import WhatsappSettingsSection from "@/components/settings/sections/WhatsappSettingsSection";

const SECTIONS = {
  company: CompanyBrandingSection,
  defaults: QuoteDefaultsSection,
  security: SecuritySection,
  rateLimits: RateLimitsSection,
  notifications: NotificationsSection,
  // Integrations is hidden (7 Oct 2026) — see SETTINGS_SECTIONS.
  data: DataSection,
  whatsapp: WhatsappSettingsSection,
};

export default function SettingsPage() {
  const { section, setSection } = useSettingsParams();
  const { data: me } = useCurrentUser();
  const isSuperAdmin = me?.role === "SUPER_ADMIN";
  const requested = sectionById(section);
  const current = requested.superAdminOnly && !isSuperAdmin ? sectionById(DEFAULT_SETTINGS_SECTION) : requested;
  const Section = SECTIONS[current.id];
  const [whatsappDirty, setWhatsappDirty] = useState(false);
  const isWhatsapp = current.id === "whatsapp";
  const guard = useUnsavedChangesGuard(isWhatsapp && whatsappDirty);

  function changeSection(next) {
    if (next === current.id) return;
    guard.requestLeave(() => setSection(next));
  }

  return (
    <div className="flex flex-col gap-6 w-full min-h-full bg-surface px-4 pt-4 pb-6 sm:px-6 sm:pt-6 lg:px-10 lg:pt-8 lg:pb-10">
      <div className="flex flex-col gap-1.5">
        <h2 className="font-montserrat font-bold text-[22px] sm:text-[28px] leading-normal text-foreground">
          {current.title}
        </h2>
        <p className="font-montserrat text-[13px] leading-normal text-muted-foreground">{current.subtitle}</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 items-start w-full">
        <SettingsNav value={current.id} onChange={changeSection} isSuperAdmin={isSuperAdmin} />
        <div key={current.id} className="flex flex-1 flex-col gap-5 min-w-0 w-full">
          {isWhatsapp ? <WhatsappSettingsSection onDirtyChange={setWhatsappDirty} /> : <Section />}
        </div>
      </div>
      <ConfirmDialog {...guard.dialog} />
    </div>
  );
}
