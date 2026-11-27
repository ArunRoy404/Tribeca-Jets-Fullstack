import CommonInput from "@/components/common/CommonInput";

/** Shared by the client and lead editors: OTHER is incomplete without its description. */
export default function LeadSourceOtherField({ source, value, onChange }) {
  if (source !== "OTHER") return null;
  return <CommonInput label="Describe the source" value={value} onChange={(event) => onChange(event.target.value)}
    required maxLength={500} placeholder="How did they hear about us?" />;
}
