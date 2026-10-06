import { Switch } from "@/components/ui/switch";
import SettingsPill from "./SettingsPill";

/**
 * A setting's label and explanation on the left, its control on the right.
 * Pass `checked`/`onCheckedChange` for a switch, or `action` for anything
 * else (a button, a status pill).
 */
export default function SettingRow({
  label,
  description,
  pill,
  pillTone,
  checked,
  onCheckedChange,
  disabled,
  action,
}) {
  const hasSwitch = typeof checked === "boolean";

  return (
    <div className="flex items-center gap-3 sm:gap-4 w-full">
      <div className="flex flex-1 flex-col gap-1 min-w-0">
        <p className="font-montserrat font-medium text-[14px] leading-normal text-foreground">{label}</p>
        {description && (
          <p className="font-montserrat text-[12px] leading-normal text-muted-foreground">{description}</p>
        )}
        {/* Below `sm` the pill drops under the text, so the label keeps its width. */}
        {pill && (
          <SettingsPill tone={pillTone} className="sm:hidden self-start mt-1">
            {pill}
          </SettingsPill>
        )}
      </div>
      {pill && (
        <SettingsPill tone={pillTone} className="hidden sm:inline-flex">
          {pill}
        </SettingsPill>
      )}
      {action}
      {hasSwitch && (
        <Switch
          size="lg"
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
          aria-label={label}
        />
      )}
    </div>
  );
}
