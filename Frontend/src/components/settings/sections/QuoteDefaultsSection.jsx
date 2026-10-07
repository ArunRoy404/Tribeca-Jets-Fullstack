"use client";

import CommonInput from "@/components/common/CommonInput";
import { useSettingsSection } from "@/hooks/settings";
import { LEAD_STAGES, formatLeadStage } from "@/lib/lead";
import {
  FOLLOW_UP_INTERVAL_OPTIONS,
  MARKUP_PRESETS,
  QUOTE_VALIDITY_OPTIONS,
} from "@/lib/settings";
import { cn } from "@/lib/utils";
import SettingsCard from "../SettingsCard";
import SettingRow from "../SettingRow";
import SettingsSelect from "../SettingsSelect";
import SettingsButton from "../SettingsButton";
import SettingsSectionStatus from "../SettingsSectionStatus";

const STAGE_OPTIONS = LEAD_STAGES.map((stage) => ({ value: stage, label: formatLeadStage(stage) }));

/**
 * The design's "Client & trip behavior" toggles (notes timelines, admin
 * keeps deleted clients) are not here: those are how the system works, not
 * preferences, and a switch that turns them off is a way to lose history
 * (MODULE_FEATURE_STATUS.md, Settings).
 */
export default function QuoteDefaultsSection() {
  const {
    values: defaults,
    set,
    save,
    isDirty,
    isSaving,
    canEdit,
    isPending,
    error,
    refetch,
  } = useSettingsSection("defaults");

  if (isPending || error) return <SettingsSectionStatus isPending={isPending} error={error} onRetry={refetch} />;

  const markup = defaults?.defaultMarkupPercent ?? "";
  const isPreset = MARKUP_PRESETS.some((preset) => String(preset) === markup);

  return (
    <>
      <SettingsCard
        title="Pricing & quote defaults"
        description="Starting values for new quotes, still editable on each quote. Existing quotes never change. New quotes start using them when the quote form is connected."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full">
          <CommonInput
            name="default-markup"
            type="number"
            label="Default Markup (%)"
            placeholder="15"
            min={0}
            step="0.5"
            value={markup}
            onChange={(e) => set("defaultMarkupPercent")(e.target.value)}
            disabled={!canEdit}
          />
          <SettingsSelect
            label="Quote Validity"
            value={defaults?.quoteValidityHours}
            onChange={set("quoteValidityHours")}
            disabled={!canEdit}
            options={QUOTE_VALIDITY_OPTIONS}
          />
          <CommonInput
            name="default-fet"
            type="number"
            label="Default FET (%)"
            placeholder="7.5"
            min={0}
            step="0.1"
            value={defaults?.defaultFetPercent ?? ""}
            onChange={(e) => set("defaultFetPercent")(e.target.value)}
            disabled={!canEdit}
          />
        </div>

        <div className="flex flex-col gap-2 w-full">
          <p className="font-montserrat font-medium text-[13px] leading-normal text-foreground">
            Suggested price presets
          </p>
          <div className="flex flex-wrap gap-2">
            {MARKUP_PRESETS.map((preset) => {
              const active = String(preset) === markup;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => set("defaultMarkupPercent")(String(preset))}
                  disabled={!canEdit}
                  aria-pressed={active}
                  className={cn(
                    "rounded-sm border px-4 py-2.5 font-montserrat font-medium text-[14px] leading-normal cursor-pointer transition-colors",
                    active
                      ? "bg-primary border-primary text-primary-foreground"
                      : "bg-white border-border text-foreground hover:bg-muted"
                  )}
                >
                  {preset}%
                </button>
              );
            })}
            <button
              type="button"
              // Custom is the markup box itself — focusing it is the whole action.
              onClick={() => document.getElementById("default-markup")?.focus()}
              disabled={!canEdit}
              aria-pressed={!isPreset}
              className={cn(
                "rounded-sm border px-4 py-2.5 font-montserrat font-medium text-[14px] leading-normal cursor-pointer transition-colors",
                !isPreset && markup !== ""
                  ? "bg-primary border-primary text-primary-foreground"
                  : "bg-white border-border text-foreground hover:bg-muted"
              )}
            >
              Custom
            </button>
          </div>
        </div>

        <SettingRow
          label="Apply FET by default"
          description={`Federal Excise Tax is calculated at ${defaults?.defaultFetPercent || "—"}% unless the trip is marked Non-FET / Exempt.`}
          checked={defaults?.applyFetByDefault}
          onCheckedChange={set("applyFetByDefault")}
          disabled={!canEdit}
        />
      </SettingsCard>

      <SettingsCard
        title="Client & trip workflow"
        description="Starting values for new clients and their follow-ups, used once the client forms are connected."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          <SettingsSelect
            label="Default Follow-up Interval"
            value={defaults?.followUpIntervalDays}
            onChange={set("followUpIntervalDays")}
            disabled={!canEdit}
            options={FOLLOW_UP_INTERVAL_OPTIONS}
          />
          <SettingsSelect
            label="Default Lead Stage"
            value={defaults?.defaultLeadStage}
            onChange={set("defaultLeadStage")}
            disabled={!canEdit}
            options={STAGE_OPTIONS}
          />
        </div>
      </SettingsCard>

      <SettingsCard title="Default quote terms" description="Used as the starting terms for newly created quotes.">
        <CommonInput
          name="quote-terms"
          type="textarea"
          value={defaults?.defaultQuoteTerms ?? ""}
          onChange={(e) => set("defaultQuoteTerms")(e.target.value)}
          disabled={!canEdit}
          className="min-h-[110px] rounded-sm p-3.5 font-montserrat text-[13px] leading-normal text-foreground"
        />
        {canEdit ? (
          <SettingsButton primary disabled={!isDirty || isSaving} onClick={save}>
            {isSaving ? "Saving…" : "Save CRM & Quote Defaults"}
          </SettingsButton>
        ) : null}
      </SettingsCard>
    </>
  );
}
