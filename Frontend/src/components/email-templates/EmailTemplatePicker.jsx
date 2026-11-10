"use client";

import RecordPicker from "@/components/common/record-picker/RecordPicker";
import { useEmailTemplate, useEmailTemplates } from "@/hooks/email-templates";
import { formatEmailCategory } from "@/lib/email";

// Only templates switched on are offered when composing.
const PARAMS = { active: true, sortBy: "name", sortOrder: "asc" };

function templateOption(template) {
  return {
    value: template?.id,
    label: template?.name,
    description: formatEmailCategory(template?.category),
  };
}

/**
 * The email template picker — `RecordPicker` over the active templates,
 * searched and paged by the server (10 Nov 2026), for the shared compose form.
 */
export default function EmailTemplatePicker({ value, onChange, placeholder = "Select template", ...props }) {
  return (
    <RecordPicker
      value={value}
      onChange={onChange}
      useList={useEmailTemplates}
      useOne={useEmailTemplate}
      params={PARAMS}
      getOption={templateOption}
      placeholder={placeholder}
      searchPlaceholder="Search template name…"
      itemLabel="templates"
      {...props}
    />
  );
}
