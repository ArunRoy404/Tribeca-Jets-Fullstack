import { Plus } from "lucide-react";
import TaskCard from "./TaskCard";

export default function TaskColumn({ column, tasks, onAddTask, onSelectTask }) {
  return (
    <div className="flex flex-col shrink-0 w-[85vw] sm:w-[300px] bg-secondary border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between gap-2 p-4 w-full">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-1 h-4 rounded-[1px] shrink-0" style={{ backgroundColor: column.accentColor }} />
          <p className="font-montserrat font-medium text-[12px] text-foreground whitespace-nowrap">{column.label}</p>
          <span className="flex items-center justify-center rounded-full size-6 border border-muted-foreground bg-white shrink-0">
            <span className="font-montserrat font-medium text-[10px] text-muted-foreground">{tasks.length}</span>
          </span>
        </div>
        <button
          type="button"
          onClick={onAddTask}
          className="flex items-center justify-center rounded-full size-6 text-muted-foreground hover:bg-black/5 shrink-0 cursor-pointer"
        >
          <Plus className="size-4" />
        </button>
      </div>

      <div className="flex flex-col gap-4 p-4 pt-0 w-full overflow-y-auto">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onClick={() => onSelectTask(task.id)} />
        ))}
        {tasks.length === 0 && (
          <p className="font-montserrat text-[12px] text-muted-foreground text-center py-6">No tasks</p>
        )}
      </div>
    </div>
  );
}
