"use client";

import { useTasksStore } from "@/store/useTasksStore";
import { taskColumns } from "@/dummyData/tasks";
import TaskColumn from "./TaskColumn";

export default function TaskBoard() {
  // Subscribe so the board re-renders when any of these change; getFilteredTasks reads current state at call time.
  useTasksStore((s) => s.tasks);
  useTasksStore((s) => s.search);
  useTasksStore((s) => s.filter);
  const getFilteredTasks = useTasksStore((s) => s.getFilteredTasks);
  const selectTask = useTasksStore((s) => s.selectTask);
  const openAddModal = useTasksStore((s) => s.openAddModal);

  const filtered = getFilteredTasks();

  return (
    <div className="flex items-start gap-4 w-full overflow-x-auto pb-2">
      {taskColumns.map((column) => (
        <TaskColumn
          key={column.key}
          column={column}
          tasks={filtered.filter((task) => task.status === column.key)}
          onAddTask={() => openAddModal(column.key)}
          onSelectTask={selectTask}
        />
      ))}
    </div>
  );
}
