"use client";

import { useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useTasks } from "@/hooks/tasks";
import { useCurrentUser } from "@/hooks/auth/useCurrentUser";
import { usePermissions } from "@/hooks/common/usePermissions";
import { Permission } from "@/lib/permissions";
import { toTask } from "@/lib/task";
import { toISODate } from "@/lib/date";

const LIMIT = 10;

/**
 * The notification bell: **your tasks due today or overdue** (Tasks Board,
 * #20) — real work from the API, assigned to you.
 *
 * It was a dummy list of invented alerts ("Payment overdue — $12,800") with
 * read/unread state and delete buttons that did nothing. The scope's wider
 * notifications (§6.22: payment, quote-expiry and trip reminders raised by
 * the system) need something to raise them, which does not exist yet — so
 * the bell shows only what is true today, and has no read state to fake.
 */
export default function NotificationPopover() {
  const router = useRouter();
  const { data: me } = useCurrentUser();
  const { can } = usePermissions();
  const enabled = Boolean(me?.id) && can(Permission.VIEW_TASKS);
  const { data } = useTasks(
    { view: "ATTENTION", assigneeId: me?.id, limit: LIMIT, on: toISODate(new Date()) },
    { enabled },
  );

  const tasks = useMemo(() => (data?.data ?? []).map(toTask), [data?.data]);
  const total = data?.meta?.total ?? 0;
  const open = (id) => router.push(`/dashboard/tasks-board?task=${id}`);

  return (
    <Popover>
      <PopoverTrigger
        aria-label={total ? `${total} of your tasks due` : "Your tasks due"}
        className="relative bg-secondary flex items-center justify-center rounded-lg size-9 sm:size-11 cursor-pointer shrink-0 outline-none"
      >
        <div className="relative size-5 sm:size-6">
          <Image src="/dashboard/icons/bell-1.svg" alt="" width={17} height={17} className="absolute left-[3px] top-[5px] w-[17px] h-[17px]" />
          <Image src="/dashboard/icons/bell-2.svg" alt="" width={6} height={2} className="absolute left-[9px] top-[23px] w-[6px] h-[2px]" />
          {total > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-3 h-3 px-0.5 rounded-full bg-destructive text-white text-[10px] font-outfit leading-none">
              {total > 99 ? "99+" : total}
            </span>
          )}
        </div>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[380px] max-w-[calc(100vw-2rem)] gap-4 p-6">
        <div className="flex flex-col gap-1 border-b border-border pb-4 w-full">
          <p className="font-montserrat font-bold text-[18px] text-foreground">Your tasks due</p>
          <p className="font-montserrat font-normal text-[13px] text-muted-foreground">
            {total === 0 ? "Nothing assigned to you is due today or overdue." : `${total} due today or overdue`}
          </p>
        </div>

        {tasks.length > 0 && (
          <div className="flex flex-col gap-2 w-full max-h-80 overflow-y-auto">
            {tasks.map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() => open(task.id)}
                className="flex gap-3 rounded-lg py-1.5 pr-3 w-full text-left bg-white border border-border cursor-pointer hover:border-purple/40"
              >
                <div className="w-1 rounded-full bg-primary shrink-0 self-stretch my-1.5" />
                <div className="flex flex-1 flex-col gap-1 py-1.5 min-w-0">
                  <p className="font-montserrat font-normal text-[14px] text-foreground truncate">{task.title}</p>
                  <p className="font-montserrat font-normal text-[12px] text-muted-foreground truncate">
                    {[task.reference, task.client, task.trip].filter(Boolean).join(" · ")}
                  </p>
                  <p
                    className={cn(
                      "font-montserrat font-medium text-[12px]",
                      task.attention === "OVERDUE" ? "text-destructive" : "text-warning",
                    )}
                  >
                    • {task.attentionLabel} · {task.dueLabel}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => router.push("/dashboard/tasks-board?view=MINE")}
          className="font-montserrat font-medium text-[13px] text-purple cursor-pointer self-start"
        >
          Open my tasks
        </button>
      </PopoverContent>
    </Popover>
  );
}
