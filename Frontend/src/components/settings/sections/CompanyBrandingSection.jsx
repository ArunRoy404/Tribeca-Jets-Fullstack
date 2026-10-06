"use client";

import Image from "next/image";
import CommonInput from "@/components/common/CommonInput";
import FileUpload from "@/components/common/FileUpload";
import Logo from "@/components/common/Logo";
import { passthroughImageLoader, uploadUrl } from "@/services/uploads.service";
import { useSettingsStore } from "@/store/useSettingsStore";
import { announceLocalSave } from "@/lib/settings";
import SettingsCard from "../SettingsCard";
import SettingRow from "../SettingRow";
import SettingsButton from "../SettingsButton";

const PROFILE_FIELDS = [
  { key: "companyName", label: "Company Name", placeholder: "Tribeca Jets" },
  { key: "primaryEmail", label: "Primary Email", placeholder: "fly@tribecajets.com", type: "email" },
  { key: "website", label: "Website", placeholder: "www.tribecajets.com" },
  { key: "phone", label: "Phone", placeholder: "+1 (000) 000-0000", type: "tel" },
  { key: "businessAddress", label: "Business Address", placeholder: "New York, NY" },
  { key: "clientServicesLabel", label: "Default Client Services Label", placeholder: "Tribeca Jets Client Services" },
];

/**
 * "Preview PDF Header" is not offered: nothing generates a PDF yet
 * (MODULE_FEATURE_STATUS.md, Settings).
 */
export default function CompanyBrandingSection() {
  const company = useSettingsStore((s) => s.company);
  const setField = useSettingsStore((s) => s.setField);
  const set = (key) => setField("company", key);

  // The contact block is a live preview of the profile above — the same
  // fields, never a second copy of them.
  const contactLines = [company?.website, company?.primaryEmail, company?.phone].filter(Boolean);

  return (
    <>
      <SettingsCard
        title="Company profile"
        description="Used across CRM emails, quotes, itineraries and downloadable PDFs."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          {PROFILE_FIELDS.map((field) => (
            <CommonInput
              key={field.key}
              name={`company-${field.key}`}
              type={field.type ?? "text"}
              label={field.label}
              placeholder={field.placeholder}
              value={company?.[field.key] ?? ""}
              onChange={(e) => set(field.key)(e.target.value)}
            />
          ))}
        </div>
      </SettingsCard>

      <SettingsCard
        title="Branding & document identity"
        description="The same identity is used on quote and itinerary PDF headers."
      >
        <div className="flex flex-col md:flex-row gap-5 items-start w-full">
          <div className="flex flex-col items-center justify-center gap-2.5 h-[130px] w-full md:w-[260px] shrink-0 bg-surface border border-border rounded-lg p-[18px]">
            <div className="relative h-14 w-40">
              {company?.logoUrl ? (
                <Image
                  src={uploadUrl(company.logoUrl)}
                  alt="Company logo"
                  fill
                  className="object-contain"
                  loader={passthroughImageLoader}
                />
              ) : (
                <Logo variant="black" width={160} height={56} className="h-14 w-40" />
              )}
            </div>
            <p className="font-montserrat text-[11px] leading-normal text-muted-foreground">Current primary logo</p>
          </div>

          <div className="flex flex-1 flex-col gap-2.5 min-w-0 w-full">
            <p className="font-montserrat font-semibold text-[14px] leading-normal text-foreground">
              Document contact block
            </p>
            <div className="flex flex-col gap-1 w-full bg-surface border border-border rounded-md p-4">
              <p className="font-montserrat font-medium text-[14px] leading-normal text-foreground">
                {company?.companyName || "—"}
              </p>
              {contactLines.map((line) => (
                <p key={line} className="font-montserrat text-[12px] leading-normal text-muted-foreground break-all">
                  {line}
                </p>
              ))}
            </div>
            <FileUpload
              kind="image"
              visibility="PUBLIC"
              accept="image/png,image/jpeg,image/webp"
              buttonLabel="Upload New Logo"
              onUploaded={(data) => set("logoUrl")(data?.url ?? "")}
              className="[&_[data-slot=button]]:h-auto [&_[data-slot=button]]:py-2.5 [&_[data-slot=button]]:text-[14px]"
            />
          </div>
        </div>
      </SettingsCard>

      <SettingsCard
        title="Client-facing document defaults"
        description="Keep letterhead consistent across quotes and itineraries."
      >
        <SettingRow
          label="Show company contact block"
          description="Display website and email in the upper-right document header."
          checked={company?.showContactBlock}
          onCheckedChange={set("showContactBlock")}
        />
        <SettingRow
          label="Use Tribeca Jets logo on PDFs"
          description="Apply the current logo to quote and itinerary exports."
          checked={company?.useLogoOnDocuments}
          onCheckedChange={set("useLogoOnDocuments")}
        />
        <SettingRow
          label="Show assigned broker contact"
          description="Include the broker name/contact on client documents."
          checked={company?.showBrokerContact}
          onCheckedChange={set("showBrokerContact")}
        />
        <SettingsButton primary onClick={() => announceLocalSave("Company & Branding")}>
          Save Company & Branding
        </SettingsButton>
      </SettingsCard>
    </>
  );
}
