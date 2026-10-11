"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  pointerWithin,
  rectIntersection,
} from "@dnd-kit/core";
import { useTasksStore } from "@/store/useTasksStore";
import { usePermissions } from "@/hooks/common/usePermissions";
import { useUpdateTask } from "@/hooks/tasks";
import { Action, Module } from "@/lib/access";
import { TASK_COLUMNS } from "@/lib/task";
import TaskColumn from "./TaskColumn";
import TaskCard from "./TaskCard";

/**
 * Custom collision detection:
 * Prefers pointerWithin so dropping inside a column activates that column directly,
 * with rectIntersection as a graceful fallback.
 */
function collisionDetection(args) {
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) {
    return pointerCollisions;
  }
  return rectIntersection(args);
}

/**
 * The five columns with smooth Drag and Drop interaction.
 * Each asks the API for its own tasks, so each column's count is the server's total.
 */
export default function TaskBoard({ params }) {
  const openAddModal = useTasksStore((s) => s.openAddModal);
  const { canAccess } = usePermissions();
  const updateTask = useUpdateTask({ quiet: false });
  const [activeTask, setActiveTask] = useState(null);

  const mayAdd = canAccess(Module.TASKS, Action.CREATE) && !params?.archived;
  const mayEdit = canAccess(Module.TASKS, Action.EDIT) && !params?.archived;

  // Activation constraint: 5px movement required so clicking cards still opens the detail sheet cleanly
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: {
      distance: 5,
    },
  });
  const keyboardSensor = useSensor(KeyboardSensor);
  const sensors = useSensors(pointerSensor, keyboardSensor);

  const handleDragStart = (event) => {
    const task = event.active.data.current?.task;
    setActiveTask(task || null);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const targetColumnKey = over.id;
    const task = active.data.current?.task;

    if (!task || task.status === targetColumnKey) return;

    // Moving card to a new column
    updateTask.mutate({ id: task.id, status: targetColumnKey });
  };

  const handleDragCancel = () => {
    setActiveTask(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex items-start gap-4 w-full overflow-x-auto pb-4">
        {TASK_COLUMNS.map((column) => (
          <TaskColumn
            key={column.key}
            column={column}
            params={params?.filterParams}
            mayEdit={mayEdit}
            onAddTask={mayAdd ? () => openAddModal(column.key) : undefined}
            onSelectTask={(id) => params?.setTask?.(id)}
          />
        ))}
      </div>

      <DragOverlay
        dropAnimation={{
          duration: 200,
          easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
        }}
      >
        {activeTask ? <TaskCard task={activeTask} isOverlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}
