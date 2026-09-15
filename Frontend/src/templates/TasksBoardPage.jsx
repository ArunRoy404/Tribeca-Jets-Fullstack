import Image from "next/image";
import Reveal from "@/components/common/Reveal";
import TasksToolbar from "@/components/tasks/TasksToolbar";
import TaskBoard from "@/components/tasks/TaskBoard";
import TaskDetailSheet from "@/components/tasks/TaskDetailSheet";
import AddTaskDialog from "@/components/tasks/AddTaskDialog";
import DeleteTaskDialog from "@/components/tasks/DeleteTaskDialog";

export default function TasksBoardPage() {
  return (
    <>
      <div className="flex flex-col gap-4 sm:gap-6 p-4 sm:p-6 w-full">
        <Reveal>
          <div className="relative flex flex-col items-start rounded-md border border-border overflow-hidden w-full">
            <Image
              src="/dashboard/bg/trips-table.png"
              alt=""
              fill
              className="object-cover opacity-50 pointer-events-none"
              sizes="1600px"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-white/90 to-[#e5eeff]/90 backdrop-blur-2xl pointer-events-none" />

            <div className="relative w-full">
              <TasksToolbar />
            </div>

            <div className="relative w-full p-4">
              <TaskBoard />
            </div>
          </div>
        </Reveal>
      </div>

      <TaskDetailSheet />
      <AddTaskDialog />
      <DeleteTaskDialog />
    </>
  );
}
