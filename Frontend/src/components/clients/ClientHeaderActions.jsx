"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Edit,
  Plus,
  MoreHorizontal,
  Calendar,
  Archive,
  Mail,
  RotateCcw,
  ExternalLink,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIssueClientPortalLink } from "@/hooks/client-portal";

export default function ClientHeaderActions({
  client,
  onEdit,
  onFollowUp,
  onArchive,
  onRestore,
  isRestoring = false,
  /** Optional (#21): shown only when given — the page passes it to a role that may send. */
  onSendEmail,
  mayCreateTrip = true,
}) {
  const router = useRouter();
  const { mutate: issuePortalLink, isPending: issuingLink } = useIssueClientPortalLink();

  const handleOpenPortal = () => {
    if (!client?.id) return;
    issuePortalLink(client.id, {
      onSuccess: (res) => {
        if (res?.path) {
          window.open(res.path, "_blank", "noopener,noreferrer");
        }
      },
    });
  };

  const handleCopyPortalLink = () => {
    if (!client?.id) return;
    issuePortalLink(client.id, {
      onSuccess: async (res) => {
        if (!res?.path) return;
        const fullUrl = `${window.location.origin}${res.path}`;
        try {
          await navigator.clipboard.writeText(fullUrl);
          toast.success("Client portal link copied to clipboard");
        } catch {
          toast.info(`Portal link: ${fullUrl}`);
        }
      },
    });
  };

  // An archived client is reachable from the Archived tab, and the only thing
  // to do with one is bring it back. Offering Edit, Create Trip and Archive on
  // a removed record is offering three actions the API refuses.
  if (client?.isArchived) {
    if (!onRestore) return null;
    return (
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 w-full sm:w-auto">
        <Button
          variant="outline"
          disabled={isRestoring}
          className="h-9 sm:h-10 text-[12px] sm:text-[13px] gap-2 font-medium flex-1 sm:flex-none cursor-pointer"
          onClick={onRestore}
        >
          <RotateCcw className="size-3.5 sm:size-4" />
          Restore Client
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 w-full sm:w-auto">
      <Button
        variant="outline"
        disabled={issuingLink}
        className="h-9 sm:h-10 text-[12px] sm:text-[13px] gap-2 font-medium flex-1 sm:flex-none cursor-pointer"
        onClick={handleOpenPortal}
      >
        <ExternalLink className="size-3.5 sm:size-4" />
        Client Portal
      </Button>

      {onEdit && (
        <Button
          variant="outline"
          className="h-9 sm:h-10 text-[12px] sm:text-[13px] gap-2 font-medium flex-1 sm:flex-none cursor-pointer"
          onClick={onEdit}
        >
          <Edit className="size-3.5 sm:size-4" />
          Edit Client
        </Button>
      )}

      {mayCreateTrip && (
        <Button
          className="bg-[#252832] hover:bg-[#252832]/90 text-white h-9 sm:h-10 text-[12px] sm:text-[13px] gap-2 font-medium flex-1 sm:flex-none cursor-pointer"
          onClick={() => router.push("/dashboard/trips/new")}
        >
          <Plus className="size-3.5 sm:size-4" />
          Create Trip
        </Button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="h-9 sm:h-10 px-3 shrink-0 gap-1.5 cursor-pointer">
            <MoreHorizontal className="size-4" />
            <span className="sr-only sm:not-sr-only text-[12px] sm:text-[13px]">More</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52 font-montserrat text-[12px]">
          <DropdownMenuItem onClick={handleCopyPortalLink} disabled={issuingLink} className="gap-2 cursor-pointer">
            <Copy className="size-3.5" />
            Copy Client Portal Link
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleOpenPortal} disabled={issuingLink} className="gap-2 cursor-pointer">
            <ExternalLink className="size-3.5" />
            Open Client Portal
          </DropdownMenuItem>
          {(onSendEmail || onFollowUp || onEdit) && <DropdownMenuSeparator />}
          {onSendEmail && (
            <DropdownMenuItem onClick={onSendEmail} className="gap-2 cursor-pointer">
              <Mail className="size-3.5" />
              Send Email
            </DropdownMenuItem>
          )}
          {onFollowUp && (
            <DropdownMenuItem onClick={onFollowUp} className="gap-2 cursor-pointer">
              <Calendar className="size-3.5" />
              Schedule Follow-up
            </DropdownMenuItem>
          )}
          {onEdit && (
            <DropdownMenuItem onClick={onEdit} className="gap-2 cursor-pointer">
              <Edit className="size-3.5" />
              Edit Profile
            </DropdownMenuItem>
          )}
          {onArchive && <DropdownMenuSeparator />}
          {onArchive && (
            <DropdownMenuItem onClick={onArchive} className="gap-2 text-destructive focus:text-destructive cursor-pointer">
              <Archive className="size-3.5" />
              Archive Client
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
