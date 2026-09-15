import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const STATUS_TONES = {
  Confirmed: "info",
  "Due Today": "destructive",
  Overdue: "destructive",
  "Due Soon": "destructive",
  Paid: "success",
  Cleared: "success",
  Pending: "pending",
  "Partially Paid": "infoStrong",
  Booked: "info",
  Quoted: "purple",
  Sourcing: "cyan",
  Requested: "info",
  "In Flight": "warning",
  "Not Departed": "pending",
  Delayed: "destructive",
  Completed: "success",
  "Pending Operator Quote": "pending",
  "Source Complete": "outline",
  Scheduled: "purple",
  Approved: "success",
  Rejected: "destructive",
  "Vendor Pending": "pending",
  // Leads & Agents
  Active: "success",
  Qualified: "info",
  Inactive: "destructive",
  Proposal: "purple",
  Contacted: "info",
  New: "cyan",
  Won: "success",
  Lost: "destructive",
  Draft: "outline",
  "In Progress": "info",
  Upcoming: "warning",
  High: "destructive",
  Medium: "warning",
  Low: "info",
  Normal: "success",
  Direct: "outline",
  Referral: "purple",
  Website: "cyan",
  Email: "info",
  Corporate: "infoStrong",
  // Email Templates Categories
  "Quote Follow-up": "warning",
  "Trip Confirmation": "success",
  "Empty Leg": "cyan",
  Payment: "destructive",
  General: "neutral",
  "Travel Agent": "infoStrong",
  Sales: "purple",
  Operations: "info",
  Billing: "destructive",
  "Customer Success": "success",
  // Operators & Fleet
  Preferred: "purple",
  Prepared: "purple",
  Available: "success",
  "In Service": "info",
  Maintenance: "warning",
  Due: "destructive",
};

const BORDER_CLASSES = {
  info: "border-info/30",
  infoStrong: "border-info/30",
  purple: "border-purple/30",
  success: "border-success/30",
  warning: "border-warning/30",
  cyan: "border-cyan/30",
  destructive: "border-destructive/30",
  pending: "",
  outline: "",
  neutral: "",
};

export default function StatusBadge({ status, className, bordered = false }) {
  const tone = STATUS_TONES[status] ?? "outline";
  return (
    <Badge tone={tone} size="sm" className={cn(bordered && BORDER_CLASSES[tone], className)}>
      {status}
    </Badge>
  );
}
