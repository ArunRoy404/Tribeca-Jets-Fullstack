"use client";

import { useRouter } from "next/navigation";
import { Edit, Plus, MoreHorizontal, Calendar, Archive, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ClientHeaderActions({
  client,
  onEdit,
  onFollowUp,
  onArchive,
  onRestore,
  isRestoring = false,
}) {
  const router = useRouter();

  // An archived client is reachable from the Archived tab, and the only thing
  // to do with one is bring it back. Offering Edit, Create Trip and Archive on
  // a removed record is offering three actions the API refuses.
  if (client?.isArchived) {
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
        className="h-9 sm:h-10 text-[12px] sm:text-[13px] gap-2 font-medium flex-1 sm:flex-none cursor-pointer"
        onClick={onEdit}
      >
        <Edit className="size-3.5 sm:size-4" />
        Edit Client
      </Button>

      <Button
        className="bg-[#252832] hover:bg-[#252832]/90 text-white h-9 sm:h-10 text-[12px] sm:text-[13px] gap-2 font-medium flex-1 sm:flex-none cursor-pointer"
        onClick={() => router.push("/dashboard/trips/new")}
      >
        <Plus className="size-3.5 sm:size-4" />
        Create Trip
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="h-9 sm:h-10 px-3 shrink-0 gap-1.5 cursor-pointer">
            <MoreHorizontal className="size-4" />
            <span className="sr-only sm:not-sr-only text-[12px] sm:text-[13px]">More</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 font-montserrat text-[12px]">
          <DropdownMenuItem onClick={onFollowUp} className="gap-2 cursor-pointer">
            <Calendar className="size-3.5" />
            Schedule Follow-up
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onEdit} className="gap-2 cursor-pointer">
            <Edit className="size-3.5" />
            Edit Profile
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onArchive} className="gap-2 text-destructive focus:text-destructive cursor-pointer">
            <Archive className="size-3.5" />
            Archive Client
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
