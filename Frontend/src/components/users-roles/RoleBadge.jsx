import { Badge } from "@/components/ui/badge";
import { formatUserRole } from "@/lib/user";
import { cn } from "@/lib/utils";

/** One colour per role, from the theme's tones — the table row and the card used to hand-roll hex copies. */
const ROLE_TONES = {
  SUPER_ADMIN: "purple",
  ADMIN: "infoStrong",
  BROKER: "info",
  ASSISTANT: "success",
  REFERRAL_AGENT: "warning",
};

export default function RoleBadge({ role, className }) {
  if (!role) return null;
  return (
    <Badge tone={ROLE_TONES[role] ?? "outline"} size="sm" className={cn("text-[11px]", className)}>
      {formatUserRole(role)}
    </Badge>
  );
}
