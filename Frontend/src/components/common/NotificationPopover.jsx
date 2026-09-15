"use client";

import { useState } from "react";
import Image from "next/image";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const notifications = [
  {
    id: 1,
    title: "New trip request from Marcus Webb",
    desc: "Teterboro → Las Vegas, Aug 28, 9 passengers",
    severity: "High",
    unread: false,
  },
  {
    id: 2,
    title: "Payment overdue-Trip TJ-2399",
    desc: "Robert Walsh-$12,800 balance overdue since Aug 6",
    severity: "High",
    unread: true,
  },
  {
    id: 3,
    title: "Operator payment Due tomorrow",
    desc: "$74,500 due Aug 14 for Trip TJ-1044",
    severity: "High",
    unread: true,
  },
  {
    id: 4,
    title: "Empty leg match found",
    desc: "3 clients match Miami → Teterboro on Aug 12",
    severity: "Medium",
    unread: false,
  },
];

const SEVERITY_TONE = { High: "text-destructive", Medium: "text-warning" };

export default function NotificationPopover() {
  const [tab, setTab] = useState("all");
  const unreadCount = notifications.filter((n) => n.unread).length;
  const visible = tab === "unread" ? notifications.filter((n) => n.unread) : notifications;

  return (
    <Popover>
      <PopoverTrigger className="relative bg-secondary flex items-center justify-center rounded-lg size-9 sm:size-11 cursor-pointer shrink-0 outline-none">
        <div className="relative size-5 sm:size-6">
          <Image src="/dashboard/icons/bell-1.svg" alt="" width={17} height={17} className="absolute left-[3px] top-[5px] w-[17px] h-[17px]" />
          <Image src="/dashboard/icons/bell-2.svg" alt="" width={6} height={2} className="absolute left-[9px] top-[23px] w-[6px] h-[2px]" />
          <span className="absolute -top-1 -right-1 flex items-center justify-center size-3 rounded-full bg-destructive text-white text-[10px] font-outfit leading-none">
            {unreadCount}
          </span>
        </div>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[380px] gap-4 p-6">
        <div className="flex items-start justify-between border-b border-border pb-4 w-full">
          <div className="flex flex-col gap-1">
            <p className="font-montserrat font-bold text-[18px] text-foreground">Notifications</p>
            <p className="font-montserrat font-normal text-[13px] text-muted-foreground">{unreadCount} unread notifications</p>
          </div>
          <button className="font-montserrat font-medium text-[13px] text-purple cursor-pointer shrink-0">
            Mark All Read
          </button>
        </div>

        <div className="flex items-center bg-secondary rounded-lg p-1 w-full gap-1">
          <button
            type="button"
            onClick={() => setTab("all")}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 font-montserrat text-[13px] font-medium cursor-pointer",
              tab === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            )}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setTab("unread")}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 font-montserrat text-[13px] font-medium cursor-pointer",
              tab === "unread" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            )}
          >
            Unread ({unreadCount})
          </button>
        </div>

        <div className="flex flex-col gap-2 w-full max-h-80 overflow-y-auto">
          {visible.map((n) => (
            <div
              key={n.id}
              className={cn(
                "flex gap-3 rounded-lg py-1.5 pr-3 w-full",
                n.unread ? "bg-white border border-border" : "bg-secondary"
              )}
            >
              <div className="w-1 rounded-full bg-primary shrink-0 self-stretch my-1.5" />
              <div className="flex flex-1 flex-col gap-2 py-1.5 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-1.5 font-montserrat font-normal text-[14px] text-foreground min-w-0">
                    <span className="truncate">{n.title}</span>
                    {n.unread && <span className="size-1.5 rounded-full bg-purple shrink-0" />}
                  </p>
                  <button type="button" className="shrink-0 cursor-pointer">
                    <Image src="/dashboard/icons/notif-delete.svg" alt="Delete" width={16} height={16} />
                  </button>
                </div>
                <p className="font-montserrat font-normal text-[12px] text-muted-foreground">{n.desc}</p>
                <p className={cn("font-montserrat font-medium text-[12px]", SEVERITY_TONE[n.severity])}>
                  • {n.severity}
                </p>
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
