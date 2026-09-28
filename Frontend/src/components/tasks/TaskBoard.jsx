"use client";

import { useTasksStore } from "@/store/useTasksStore";
import { usePermissions } from "@/hooks/common/usePermissions";
import { Permission } from "@/lib/permissions";
import { TASK_COLUMNS } from "@/lib/task";
import TaskColumn from "./TaskColumn";

/**
 * The five columns. Each asks the API for its own tasks, so each column's
 * count is the server's total for that status under the board's filters —
 * not a count of whatever happened to load.
 */
export default function TaskBoard({ params }) {
  const openAddModal = useTasksStore((s) => s.openAddModal);
  const { canWrite } = usePermissions();
  const mayAdd = canWrite(Permission.MANAGE_TASKS) && !params?.archived;

  return (
    <div className="flex items-start gap-4 w-full overflow-x-auto pb-2">
      {TASK_COLUMNS.map((column) => (
        <TaskColumn
          key={column.key}
          column={column}
          params={params?.filterParams}
          onAddTask={mayAdd ? () => openAddModal(column.key) : undefined}
          onSelectTask={(id) => params?.setTask?.(id)}
        />
      ))}
    </div>
  );
}
