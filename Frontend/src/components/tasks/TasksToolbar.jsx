"use client";

import { Plus } from "lucide-react";
import { useTasksStore } from "@/store/useTasksStore";
import { taskFilterOptions } from "@/dummyData/tasks";
import SearchInput from "@/components/table/common/SearchInput";
import FilterTabs from "@/components/table/common/FilterTabs";
import { Button } from "@/components/ui/button";

export default function TasksToolbar() {
  const search = useTasksStore((s) => s.search);
  const setSearch = useTasksStore((s) => s.setSearch);
  const filter = useTasksStore((s) => s.filter);
  const setFilter = useTasksStore((s) => s.setFilter);
  const openAddModal = useTasksStore((s) => s.openAddModal);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-4 w-full bg-sidebar">
      <div className="flex flex-wrap items-center gap-3 min-w-0 max-w-full">
        <SearchInput
          size="sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64 max-w-full shrink-0"
        />
        <FilterTabs options={taskFilterOptions} value={filter} onValueChange={setFilter} className="max-w-full" />
      </div>

      <Button className="gap-2 px-4 shrink-0" onClick={() => openAddModal()}>
        <Plus className="size-4" />
        Add Task
      </Button>
    </div>
  );
}
