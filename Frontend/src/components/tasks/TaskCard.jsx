import { cn } from "@/lib/utils";
import { PRIORITY_STYLES, CHIP_STYLES } from "./taskBadgeStyles";
import TaskChip from "./TaskChip";

function getInitial(name = "") {
  return name.charAt(0).toUpperCase();
}

/**
 * One task on the board. The due date is red only when the API says the task
 * is overdue or due today; the old "Auto" chip is gone — nothing raises
 * tasks automatically yet, so no card may claim it was.
 */
export default function TaskCard({ task, onClick }) {
  const priorityStyle = PRIORITY_STYLES[task?.priorityLabel] ?? PRIORITY_STYLES.Medium;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-start gap-2.5 w-full bg-white border border-border rounded-lg p-2 text-left cursor-pointer hover:border-purple/40 hover:shadow-sm transition-all"
    >
      <div className="flex flex-1 flex-col gap-2 min-w-0">
        <div className="flex items-start justify-between gap-2 w-full">
          <p className="flex-1 font-montserrat font-normal text-[14px] text-foreground leading-tight">{task?.title}</p>
          <span className="font-montserrat text-[10px] text-muted-foreground shrink-0">{task?.reference}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <TaskChip style={priorityStyle} dot={priorityStyle.dot}>
            {task?.priorityLabel}
          </TaskChip>
          <p
            className={cn(
              "font-montserrat font-normal text-[14px] whitespace-nowrap",
              task?.attention ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {task?.attentionLabel ? `${task.attentionLabel} · ${task.dueLabel}` : task?.dueLabel}
          </p>
        </div>

        {(task?.client || task?.trip) && (
          <div className="flex flex-wrap items-center gap-2">
            {task?.client && <TaskChip style={CHIP_STYLES.slate}>{task.client}</TaskChip>}
            {task?.trip && <TaskChip style={CHIP_STYLES.blue}>{task.trip}</TaskChip>}
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="flex items-center justify-center rounded-full size-[30px] border font-montserrat font-medium text-[12px] shrink-0"
              style={{ backgroundColor: CHIP_STYLES.blue.bg, borderColor: CHIP_STYLES.blue.border, color: CHIP_STYLES.blue.text }}
            >
              {task?.assigneeId ? getInitial(task?.assignee) : "—"}
            </span>
            <p className="font-montserrat font-normal text-[14px] text-muted-foreground truncate">{task?.assignee}</p>
          </div>
          {task?.checklistTotal > 0 && (
            <span className="font-montserrat font-medium text-[11px] text-purple shrink-0">
              {task.checklistDone}/{task.checklistTotal}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
