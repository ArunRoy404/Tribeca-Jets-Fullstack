import { PRIORITY_STYLES, CHIP_STYLES } from "./taskBadgeStyles";
import TaskChip from "./TaskChip";

function getInitial(name = "") {
  return name.charAt(0).toUpperCase();
}

export default function TaskCard({ task, onClick }) {
  const priorityStyle = PRIORITY_STYLES[task.priority] ?? PRIORITY_STYLES.Medium;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-start gap-2.5 w-full bg-white border border-border rounded-lg p-2 text-left cursor-pointer hover:border-purple/40 hover:shadow-sm transition-all"
    >
      <div className="flex flex-1 flex-col gap-2 min-w-0">
        <div className="flex items-start justify-between gap-2 w-full">
          <p className="flex-1 font-montserrat font-normal text-[14px] text-foreground leading-tight">{task.title}</p>
          {task.auto && (
            <TaskChip style={CHIP_STYLES.indigo} className="shrink-0">
              Auto
            </TaskChip>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <TaskChip style={priorityStyle} dot={priorityStyle.dot}>
            {task.priority}
          </TaskChip>
          <p className="font-montserrat font-normal text-[14px] text-destructive whitespace-nowrap">{task.dueDate}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <TaskChip style={CHIP_STYLES.slate}>{task.client}</TaskChip>
          {task.trip && <TaskChip style={CHIP_STYLES.blue}>{task.trip}</TaskChip>}
        </div>

        <div className="flex items-center gap-2">
          <span
            className="flex items-center justify-center rounded-full size-[30px] border font-montserrat font-medium text-[12px] shrink-0"
            style={{ backgroundColor: CHIP_STYLES.blue.bg, borderColor: CHIP_STYLES.blue.border, color: CHIP_STYLES.blue.text }}
          >
            {getInitial(task.assignee)}
          </span>
          <p className="font-montserrat font-normal text-[14px] text-muted-foreground">{task.assignee}</p>
        </div>
      </div>
    </button>
  );
}
