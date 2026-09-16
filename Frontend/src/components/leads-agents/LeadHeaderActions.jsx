"use client";

import { CalendarClock, CheckCircle2, UserCheck, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function LeadHeaderActions({
  onEdit,
  onFollowUp,
  onConvert,
  onAssignBroker,
  onArchive,
}) {
  return (
    <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 w-full sm:w-auto">
      <Button
        variant="outline"
        className="h-9 sm:h-10 text-[12px] sm:text-[13px] gap-2 font-medium flex-1 sm:flex-none cursor-pointer"
        onClick={onFollowUp}
      >
        <CalendarClock className="size-3.5 sm:size-4" />
        Follow-up
      </Button>

      <Button
        variant="outline"
        className="h-9 sm:h-10 text-[12px] sm:text-[13px] gap-2 font-medium flex-1 sm:flex-none cursor-pointer"
        onClick={onConvert}
      >
        <CheckCircle2 className="size-3.5 sm:size-4" />
        Convert to Client
      </Button>

      <Button
        className="bg-[#252832] hover:bg-[#252832]/90 text-white h-9 sm:h-10 text-[12px] sm:text-[13px] gap-2 font-medium flex-1 sm:flex-none cursor-pointer"
        onClick={onAssignBroker}
      >
        <UserCheck className="size-3.5 sm:size-4" />
        Assign Broker
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="h-9 sm:h-10 px-3 shrink-0 gap-1.5 cursor-pointer">
            <MoreHorizontal className="size-4" />
            <span className="sr-only sm:not-sr-only text-[12px] sm:text-[13px]">More</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 font-montserrat text-[12px]">
          <DropdownMenuItem onClick={onEdit} className="gap-2 cursor-pointer">
            <Edit className="size-3.5" />
            Edit Details
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onArchive} className="gap-2 text-destructive focus:text-destructive cursor-pointer">
            <Trash2 className="size-3.5" />
            Archive Lead
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
