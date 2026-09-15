import { Badge } from "@/components/ui/badge";

const STATUS_TONES = {
  Overdue: "destructive",
  "Due Soon": "destructive",
  "Partially Paid": "infoStrong",
  Pending: "warning",
  Paid: "success",
};

export default function FinanceStatusBadge({ status }) {
  return (
    <Badge tone={STATUS_TONES[status]} size="sm" className="rounded-[3px] shrink-0">
      {status}
    </Badge>
  );
}
