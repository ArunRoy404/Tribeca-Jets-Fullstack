import CommonSelect from "@/components/common/CommonSelect";
import { Label } from "@/components/ui/label";

/** A labelled dropdown at the same size as `CommonInput`, as the design draws them side by side. */
export default function SettingsSelect({ label, value, onChange, options, placeholder, disabled }) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      {label && <Label className="font-montserrat text-base font-medium text-foreground">{label}</Label>}
      <CommonSelect
        value={value}
        onChange={onChange}
        options={options}
        placeholder={placeholder}
        disabled={disabled}
        className="data-[size=default]:h-13 rounded-sm px-4 text-base font-medium [&_svg]:size-5"
      />
    </div>
  );
}
