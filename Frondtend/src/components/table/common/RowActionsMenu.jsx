"use client";

import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function RowActionsMenu({ items, actions }) {
  const menuItems = items || actions || [];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex items-center justify-center size-6 rounded-sm cursor-pointer text-muted-foreground hover:bg-muted hover:text-foreground outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        {menuItems?.map((item, index) =>
          item === "separator" ? (
            <DropdownMenuSeparator key={`sep-${index}`} />
          ) : (
            <DropdownMenuItem
              key={item?.label || index}
              variant={item?.variant}
              onClick={(e) => {
                e.stopPropagation();
                if (item?.onSelect) item.onSelect();
                if (item?.onClick) item.onClick();
              }}
            >
              {item?.icon}
              {item?.label}
            </DropdownMenuItem>
          )
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
