"use client";

import { useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { Loader2, Plus } from "lucide-react";
import { useTasks } from "@/hooks/tasks";
import { toTask } from "@/lib/task";
import { cn } from "@/lib/utils";
import TaskCard from "./TaskCard";

/** How many cards one column loads. A longer column says how many more there are. */
const COLUMN_LIMIT = 50;

export default function TaskColumn({ column, params, onAddTask, onSelectTask, mayEdit = false }) {
  const { data, isPending, error } = useTasks({ ...params, status: column.key, limit: COLUMN_LIMIT });
  const tasks = useMemo(() => (data?.data ?? []).map(toTask), [data?.data]);
  const total = data?.meta?.total;

  const { setNodeRef, isOver } = useDroppable({
    id: column.key,
    disabled: !mayEdit,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col shrink-0 w-[85vw] sm:w-[300px] bg-secondary/80 border border-border rounded-lg overflow-hidden transition-all duration-200 min-h-[520px]",
        isOver && "ring-2 ring-purple/50 border-purple/70 bg-purple/[0.04] shadow-md",
      )}
    >
      <div className="flex items-center justify-between gap-2 p-4 w-full border-b border-border/50 bg-white/40">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={cn("w-1.5 h-4 rounded-[1px] shrink-0", column.accentClassName)} />
          <p className="font-montserrat font-semibold text-[13px] text-foreground whitespace-nowrap">{column.label}</p>
          <span className="flex items-center justify-center rounded-full min-w-6 h-6 px-1.5 border border-muted-foreground/30 bg-white shrink-0">
            <span className="font-montserrat font-semibold text-[11px] text-muted-foreground">{total ?? "—"}</span>
          </span>
        </div>
        {onAddTask && (
          <button
            type="button"
            onClick={onAddTask}
            aria-label={`Add a task to ${column.label}`}
            className="flex items-center justify-center rounded-full size-6 text-muted-foreground hover:bg-black/5 shrink-0 cursor-pointer transition-colors"
          >
            <Plus className="size-4" />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3 p-4 w-full overflow-y-auto flex-1">
        {isPending && <Loader2 className="size-4 animate-spin text-purple mx-auto my-6" />}
        {error && (
          <p className="font-montserrat text-[12px] text-destructive text-center py-6">Could not load this column</p>
        )}
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            mayEdit={mayEdit}
            onClick={() => onSelectTask?.(task.id)}
          />
        ))}
        {!isPending && !error && tasks.length === 0 && (
          <div
            className={cn(
              "flex flex-col items-center justify-center border-2 border-dashed border-border/60 rounded-lg p-6 my-2 text-center transition-colors min-h-[120px]",
              isOver && "border-purple/60 bg-purple/10",
            )}
          >
            <p className="font-montserrat text-[12px] text-muted-foreground">
              {isOver ? "Drop task here" : "No tasks"}
            </p>
          </div>
        )}
        {total > tasks.length && (
          <p className="font-montserrat text-[11px] text-muted-foreground text-center pt-2">
            Showing {tasks.length} of {total}. Search or pick a view to narrow it.
          </p>
        )}
      </div>
    </div>
  );
}
