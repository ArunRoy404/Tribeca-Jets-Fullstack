import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const STATUS_TONES = {
  Confirmed: "info",
  VIP: "warning",
  "Due Today": "destructive",
  Overdue: "destructive",
  "Due Soon": "destructive",
  Paid: "success",
  Cleared: "success",
  Pending: "pending",
  "Partially Paid": "infoStrong",
  Booked: "info",
  Quoted: "purple",
  Viewed: "purple",
  Sourcing: "cyan",
  // Trip requests. "Open" is an enquiry nobody has started working;
  // "Converted" is one that became a trip, which is the win.
  Open: "info",
  Converted: "success",
  Requested: "info",
  "In Flight": "warning",
  "Not Departed": "pending",
  Delayed: "destructive",
  // Flight Tracking (#14) — a flight's hand-reported state. "No Update" is
  // nobody having reported yet, which is not the same as "Not Departed".
  Landed: "success",
  Diverted: "warning",
  "No Update": "outline",
  Completed: "success",
  Cancelled: "destructive",
  "Pending Operator Quote": "pending",
  "Source Complete": "outline",
  Scheduled: "purple",
  Approved: "success",
  Rejected: "destructive",
  "Vendor Pending": "pending",
  // Operator Sourcing quotes
  "Awaiting Response": "pending",
  Received: "cyan",
  Declined: "destructive",
  // Team members (users & roles)
  Invited: "pending",
  Suspended: "destructive",
  // Permission levels shown on the roles cards and the table's Permission column
  Owner: "purple",
  Admin: "infoStrong",
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
  "Client Update": "info",
  // The sent log (#21): on the queue, delivered, recorded but delivered to nobody, refused
  Sending: "pending",
  Sent: "success",
  "Not delivered": "warning",
  Failed: "destructive",
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
  // Empty legs (#10b)
  Matched: "purple",
  Expired: "pending",
  // Commissions and portal referrals (#11)
  Earned: "info",
  Submitted: "cyan",
  Quoting: "purple",
  // Receivables (#16): a trip whose client has been sent nothing yet
  "Not Invoiced": "pending",
  // Operator Payments (#17): a trip with no operator bill recorded
  "Not Recorded": "pending",
  // Transactions (#19): the three kinds of money movement
  "Client Payment": "success",
  "Operator Payment": "warning",
  Commission: "info",
  // Document Vault (#22): a passport's or certificate's expiry
  "Expiring Soon": "warning",
  Valid: "success",
  "No Expiry": "outline",
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
