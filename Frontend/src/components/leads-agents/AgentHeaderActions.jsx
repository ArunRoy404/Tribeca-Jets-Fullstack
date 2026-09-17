"use client";

import { Edit, UserPlus, MoreHorizontal, ShieldCheck, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";

export default function AgentHeaderActions({
  agent,
  onEdit,
  onAssignLead,
}) {
  const router = useRouter();
  // The agent's own address, from the record — never a constructed one.
  const email = agent?.email && agent.email !== "\u2014" ? agent.email : null;

  return (
    <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 w-full sm:w-auto">
      <Button
        variant="outline"
        className="h-9 sm:h-10 text-[12px] sm:text-[13px] gap-2 font-medium flex-1 sm:flex-none cursor-pointer"
        onClick={onEdit}
      >
        <Edit className="size-3.5 sm:size-4" />
        Edit Agent
      </Button>

      <Button
        className="bg-[#252832] hover:bg-[#252832]/90 text-white h-9 sm:h-10 text-[12px] sm:text-[13px] gap-2 font-medium flex-1 sm:flex-none cursor-pointer"
        onClick={onAssignLead}
      >
        <UserPlus className="size-3.5 sm:size-4" />
        Assign Lead
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="h-9 sm:h-10 px-3 shrink-0 gap-1.5 cursor-pointer">
            <MoreHorizontal className="size-4" />
            <span className="sr-only sm:not-sr-only text-[12px] sm:text-[13px]">More</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52 font-montserrat text-[12px]">
          <DropdownMenuItem onClick={() => router.push("/dashboard/users-roles")} className="gap-2 cursor-pointer">
            <ShieldCheck className="size-3.5" />
            Manage in Users & Roles
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {/* A real mailto against the address on the record. This did nothing
              at all before, which looks identical to a mail client that failed
              to open. */}
          <DropdownMenuItem
            disabled={!email}
            onClick={() => email && window.open(`mailto:${email}`, "_self")}
            className="gap-2 cursor-pointer"
          >
            <Mail className="size-3.5" />
            Send Direct Email
          </DropdownMenuItem>
          {/* Logging a call needs somewhere to log it. Disabled and labelled
              rather than silently inert, so the desk knows it is coming rather
              than thinking it is broken. */}
          <DropdownMenuItem disabled className="gap-2">
            <Phone className="size-3.5" />
            Log Call Activity
            <span className="ml-auto text-[10px] text-muted-foreground">
              With Communications
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
