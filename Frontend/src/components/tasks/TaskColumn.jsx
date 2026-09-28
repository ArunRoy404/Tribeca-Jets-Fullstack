"use client";

import { useMemo } from "react";
import { Loader2, Plus } from "lucide-react";
import { useTasks } from "@/hooks/tasks";
import { toTask } from "@/lib/task";
import { cn } from "@/lib/utils";
import TaskCard from "./TaskCard";

/** How many cards one column loads. A longer column says how many more there are. */
const COLUMN_LIMIT = 50;

export default function TaskColumn({ column, params, onAddTask, onSelectTask }) {
  const { data, isPending, error } = useTasks({ ...params, status: column.key, limit: COLUMN_LIMIT });
  const tasks = useMemo(() => (data?.data ?? []).map(toTask), [data?.data]);
  const total = data?.meta?.total;

  return (
    <div className="flex flex-col shrink-0 w-[85vw] sm:w-[300px] bg-secondary border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between gap-2 p-4 w-full">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={cn("w-1 h-4 rounded-[1px] shrink-0", column.accentClassName)} />
          <p className="font-montserrat font-medium text-[12px] text-foreground whitespace-nowrap">{column.label}</p>
          <span className="flex items-center justify-center rounded-full min-w-6 h-6 px-1 border border-muted-foreground bg-white shrink-0">
            <span className="font-montserrat font-medium text-[10px] text-muted-foreground">{total ?? "—"}</span>
          </span>
        </div>
        {onAddTask && (
          <button
            type="button"
            onClick={onAddTask}
            aria-label={`Add a task to ${column.label}`}
            className="flex items-center justify-center rounded-full size-6 text-muted-foreground hover:bg-black/5 shrink-0 cursor-pointer"
          >
            <Plus className="size-4" />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-4 p-4 pt-0 w-full overflow-y-auto">
        {isPending && <Loader2 className="size-4 animate-spin text-purple mx-auto my-6" />}
        {error && (
          <p className="font-montserrat text-[12px] text-destructive text-center py-6">Could not load this column</p>
        )}
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onClick={() => onSelectTask?.(task.id)} />
        ))}
        {!isPending && !error && tasks.length === 0 && (
          <p className="font-montserrat text-[12px] text-muted-foreground text-center py-6">No tasks</p>
        )}
        {total > tasks.length && (
          <p className="font-montserrat text-[11px] text-muted-foreground text-center">
            Showing {tasks.length} of {total}. Search or pick a view to narrow it.
          </p>
        )}
      </div>
    </div>
  );
}
