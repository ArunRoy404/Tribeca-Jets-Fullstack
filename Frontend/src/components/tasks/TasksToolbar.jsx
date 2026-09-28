"use client";

import { Plus } from "lucide-react";
import SearchInput from "@/components/table/common/SearchInput";
import FilterTabs from "@/components/table/common/FilterTabs";
import { Button } from "@/components/ui/button";
import { useTasksStore } from "@/store/useTasksStore";
import { useDebouncedParam } from "@/hooks/common/useTableQueryParams";
import { usePermissions } from "@/hooks/common/usePermissions";
import { Permission } from "@/lib/permissions";
import { TASK_VIEWS, formatTaskView } from "@/lib/task";

const VIEW_BY_LABEL = Object.fromEntries(TASK_VIEWS.map((view) => [formatTaskView(view), view]));

export default function TasksToolbar({ params }) {
  const openAddModal = useTasksStore((s) => s.openAddModal);
  const { canWrite } = usePermissions();
  const [draft, setDraft] = useDebouncedParam(params?.search, params?.setSearch);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-4 w-full bg-sidebar">
      <div className="flex flex-wrap items-center gap-3 min-w-0 max-w-full">
        <SearchInput
          size="sm"
          placeholder="Search tasks, TSK-12, TJ-1048, client..."
          value={draft ?? ""}
          onChange={(e) => setDraft?.(e.target.value)}
          className="w-64 max-w-full shrink-0"
        />
        <FilterTabs
          options={TASK_VIEWS.map(formatTaskView)}
          value={formatTaskView(params?.view)}
          onValueChange={(label) => params?.setView?.(VIEW_BY_LABEL[label] ?? "ALL")}
          className="max-w-full"
        />
      </div>

      {canWrite(Permission.MANAGE_TASKS) && !params?.archived && (
        <Button className="gap-2 px-4 shrink-0" onClick={() => openAddModal()}>
          <Plus className="size-4" />
          Add Task
        </Button>
      )}
    </div>
  );
}
