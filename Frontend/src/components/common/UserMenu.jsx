"use client";

import Image from "next/image";
import { LogOut, Settings, User } from "lucide-react";
import UserAvatar from "@/components/common/UserAvatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const menuItems = [
  { label: "Account", icon: User },
  { label: "Settings", icon: Settings },
];

export default function UserMenu({ name, role }) {
  return (
    <Popover>
      <PopoverTrigger className="bg-secondary flex gap-2 sm:gap-4 items-center h-9 sm:h-11 px-2 rounded-lg cursor-pointer outline-none">
        <UserAvatar name={name} size="sm" />
        <div className="hidden flex-col gap-1 items-start justify-center text-left sm:flex">
          <p className="font-montserrat font-medium text-[12px] text-foreground">{name}</p>
          <p className="font-montserrat font-normal text-[10px] text-muted-foreground">{role}</p>
        </div>
        <Image src="/dashboard/icons/chevron-down.svg" alt="" width={16} height={16} />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-1.5">
        <div className="flex items-center gap-2 px-2 py-2">
          <UserAvatar name={name} size="sm" />
          <div className="flex flex-col gap-0.5 text-left leading-tight">
            <p className="font-montserrat font-medium text-[12px] text-foreground">{name}</p>
            <p className="font-montserrat font-normal text-[10px] text-muted-foreground">{role}</p>
          </div>
        </div>
        <div className="my-1 h-px bg-border" />
        {menuItems.map(({ label, icon: Icon }) => (
          <button
            key={label}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 font-montserrat text-sm text-foreground hover:bg-muted cursor-pointer"
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
        <div className="my-1 h-px bg-border" />
        <button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 font-montserrat text-sm text-destructive hover:bg-destructive/10 cursor-pointer">
          <LogOut className="size-4" />
          Log out
        </button>
      </PopoverContent>
    </Popover>
  );
}
