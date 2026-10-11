"use client";

import Image from "next/image";
import CommonInput from "@/components/common/CommonInput";
import FileUpload, { ACCEPT } from "@/components/common/FileUpload";
import BrandLogo from "@/components/common/BrandLogo";
import { passthroughImageLoader, uploadUrl } from "@/services/uploads.service";
import { useSettingsSection } from "@/hooks/settings";
import SettingsCard from "../SettingsCard";
import SettingRow from "../SettingRow";
import SettingsButton from "../SettingsButton";
import SettingsSectionStatus from "../SettingsSectionStatus";

const PROFILE_FIELDS = [
  { key: "companyName", label: "Company Name", placeholder: "Tribeca Jets" },
  { key: "companyEmail", label: "Primary Email (Optional)", placeholder: "fly@tribecajets.com", type: "email" },
  { key: "website", label: "Website (Optional)", placeholder: "www.tribecajets.com" },
  { key: "phone", label: "Phone (Optional)", placeholder: "+1 (000) 000-0000", type: "tel" },
  { key: "address", label: "Business Address (Optional)", placeholder: "New York, NY" },
  { key: "clientServicesLabel", label: "Client Services Label (Optional)", placeholder: "Tribeca Jets Client Services" },
];

/**
 * The company's identity — read by every sidebar and the sign-in page through
 * the public branding endpoint, and later by the letterhead and documents.
 *
 * "Preview PDF Header" is not offered: nothing generates a PDF yet
 * (MODULE_FEATURE_STATUS.md, Settings).
 */
export default function CompanyBrandingSection() {
  const { values, set, save, isDirty, isSaving, canEdit, isPending, error, refetch } =
    useSettingsSection("company");

  if (isPending || error) return <SettingsSectionStatus isPending={isPending} error={error} onRetry={refetch} />;

  // The contact block previews exactly what the app and documents show — all
  // or nothing: every filled-in line while the toggle is on, none while off.
  const contactLines = values.showContactBlock
    ? [values.companyName, values.website, values.companyEmail, values.phone, values.address].filter(Boolean)
    : [];

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
              value={values[field.key]}
              onChange={(e) => set(field.key)(e.target.value)}
              disabled={!canEdit}
              required={field.key === "companyName"}
            />
          ))}
        </div>
      </SettingsCard>

      <SettingsCard
        title="Branding & document identity"
        description="The logo shows in every sidebar and on the sign-in page; documents follow the toggles below."
      >
        <div className="flex flex-col md:flex-row gap-5 items-start w-full">
          <div className="flex flex-col items-center justify-center gap-2.5 h-[130px] w-full md:w-[260px] shrink-0 bg-surface border border-border rounded-lg p-[18px]">
            <div className="relative h-14 w-40">
              {values.logoUrl ? (
                <Image
                  src={uploadUrl(values.logoUrl)}
                  alt="Company logo"
                  fill
                  className="object-contain"
                  loader={passthroughImageLoader}
                />
              ) : (
                <BrandLogo tone="dark" width={160} height={56} className="h-14 w-40" />
              )}
            </div>
            <p className="font-montserrat text-[11px] leading-normal text-muted-foreground">
              {values.logoUrl ? "Current logo" : "Built-in logo — none uploaded"}
            </p>
          </div>

          <div className="flex flex-1 flex-col gap-2.5 min-w-0 w-full">
            <p className="font-montserrat font-semibold text-[14px] leading-normal text-foreground">
              Document contact block
            </p>
            <div className="flex flex-col gap-1 w-full bg-surface border border-border rounded-md p-4">
              {contactLines.map((line, index) => (
                <p
                  key={line}
                  className={
                    index === 0
                      ? "font-montserrat font-medium text-[14px] leading-normal text-foreground"
                      : "font-montserrat text-[12px] leading-normal text-muted-foreground break-all"
                  }
                >
                  {line}
                </p>
              ))}
              {!values.showContactBlock ? (
                <p className="font-montserrat text-[12px] leading-normal text-muted-foreground">
                  Hidden — the company name and contact details show nowhere while the contact block is off.
                </p>
              ) : null}
            </div>
            {canEdit ? (
              <div className="flex flex-wrap items-start gap-2.5">
                <FileUpload
                  kind="image"
                  visibility="PUBLIC"
                  accept={ACCEPT.image}
                  buttonLabel={values.logoUrl ? "Replace Logo" : "Upload Logo"}
                  onUploaded={(data) => set("logoUrl")(data?.url ?? "")}
                  className="[&_[data-slot=button]]:h-auto [&_[data-slot=button]]:py-2.5 [&_[data-slot=button]]:text-[14px]"
                />
                {values.logoUrl ? (
                  <SettingsButton onClick={() => set("logoUrl")("")}>Use Built-in Logo</SettingsButton>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </SettingsCard>

      <SettingsCard
        title="Client-facing document defaults"
        description="Keep letterhead consistent across quotes and itineraries."
      >
        <SettingRow
          label="Show company contact block"
          description="Show the company name, website, email, phone and address at the top of every panel and document. Off hides them all."
          checked={values.showContactBlock}
          onCheckedChange={set("showContactBlock")}
          disabled={!canEdit}
        />
        <SettingRow
          label="Use the company logo on documents"
          description="Apply the current logo to quote and itinerary documents."
          checked={values.logoOnDocuments}
          onCheckedChange={set("logoOnDocuments")}
          disabled={!canEdit}
        />
        <SettingRow
          label="Show assigned broker contact"
          description="Include the broker name/contact on client documents."
          checked={values.showBrokerContact}
          onCheckedChange={set("showBrokerContact")}
          disabled={!canEdit}
        />
        {canEdit ? (
          <SettingsButton primary disabled={!isDirty || isSaving} onClick={save}>
            {isSaving ? "Saving…" : "Save Company & Branding"}
          </SettingsButton>
        ) : null}
      </SettingsCard>
    </>
  );
}
