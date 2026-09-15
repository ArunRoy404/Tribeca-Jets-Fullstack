"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useTasksStore } from "@/store/useTasksStore";
import { taskColumns, taskPriorityOptions, taskAssigneeOptions } from "@/dummyData/tasks";
import { clientOptions } from "@/dummyData/createTripOptions";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import FormField from "@/components/trips/FormField";
import PickerSelect from "@/components/trips/PickerSelect";
import DatePicker from "@/components/common/DatePicker";
import { cn } from "@/lib/utils";

const FIELD_CLASS = "h-13 px-4 rounded-sm text-base font-medium";
const LABEL_CLASS = "text-[16px] text-foreground mb-2";

const EMPTY_FORM = {
  title: "",
  description: "",
  status: "To Do",
  priority: "",
  assignee: "",
  dueDate: "",
  client: "",
  trip: "",
  checklist: [],
  notes: "",
};

function TaskForm({ editingTask, defaultStatus, onClose, onSubmit }) {
  const [form, setForm] = useState(() =>
    editingTask ? { ...EMPTY_FORM, ...editingTask } : { ...EMPTY_FORM, status: defaultStatus }
  );
  const [subtaskDraft, setSubtaskDraft] = useState("");

  const setField = (field) => (value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleAddSubtask = () => {
    if (!subtaskDraft.trim()) return;
    setForm((prev) => ({
      ...prev,
      checklist: [...prev.checklist, { id: `CHK-${Date.now()}`, text: subtaskDraft.trim(), done: false }],
    }));
    setSubtaskDraft("");
  };

  const handleRemoveSubtask = (id) => {
    setForm((prev) => ({ ...prev, checklist: prev.checklist.filter((item) => item.id !== id) }));
  };

  const handleSubmit = () => {
    onSubmit({ ...form, priority: form.priority || "Medium" });
  };

  return (
    <>
      <div className="border-b border-secondary flex items-start justify-between gap-4 pb-4 w-full">
        <DialogTitle className="font-montserrat font-bold text-[20px] text-black-text leading-none">
          {editingTask ? "Edit Task" : "Add Task"}
        </DialogTitle>
      </div>

      <FormField label="Title" labelClassName={LABEL_CLASS}>
        <Input
          className={FIELD_CLASS}
          placeholder="Type.."
          value={form.title}
          onChange={(e) => setField("title")(e.target.value)}
        />
      </FormField>

      <FormField label="Description" labelClassName={LABEL_CLASS}>
        <Textarea
          className="rounded-sm text-base font-medium min-h-24"
          placeholder="Type..."
          value={form.description}
          onChange={(e) => setField("description")(e.target.value)}
        />
      </FormField>

      <div className="flex flex-col sm:flex-row gap-4 items-start w-full">
        <FormField label="Status" labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
          <PickerSelect
            value={form.status}
            onChange={setField("status")}
            options={taskColumns.map((c) => c.key)}
            placeholder="Select"
            className={FIELD_CLASS}
          />
        </FormField>
        <FormField label="Priority" labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
          <PickerSelect
            value={form.priority}
            onChange={setField("priority")}
            options={taskPriorityOptions}
            placeholder="Select"
            className={FIELD_CLASS}
          />
        </FormField>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start w-full">
        <FormField label="Assign To" labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
          <PickerSelect
            value={form.assignee}
            onChange={setField("assignee")}
            options={taskAssigneeOptions}
            placeholder="Select"
            className={FIELD_CLASS}
          />
        </FormField>
        <FormField label="Due date" labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
          <DatePicker
            className={FIELD_CLASS}
            value={form.dueDate}
            onChange={setField("dueDate")}
            placeholder="Choose Date"
          />
        </FormField>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start w-full">
        <FormField label="Client" labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
          <PickerSelect
            value={form.client}
            onChange={setField("client")}
            options={clientOptions}
            placeholder="Select"
            className={FIELD_CLASS}
          />
        </FormField>
        <FormField label="Trip / Reference" labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
          <Input
            className={FIELD_CLASS}
            placeholder="e.g. TJ-1048"
            value={form.trip}
            onChange={(e) => setField("trip")(e.target.value)}
          />
        </FormField>
      </div>

      <FormField label="Checklist / Subtasks" labelClassName={LABEL_CLASS}>
        <div className="flex flex-col gap-2 w-full">
          {form.checklist.map((item) => (
            <div key={item.id} className="flex items-center gap-2.5 bg-secondary rounded-sm p-2 w-full">
              <Checkbox checked={item.done} disabled />
              <span className="flex-1 font-montserrat font-medium text-[14px] text-slate">{item.text}</span>
              <button
                type="button"
                onClick={() => handleRemoveSubtask(item.id)}
                className="flex items-center justify-center text-destructive cursor-pointer shrink-0"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
          <div className="flex gap-2 items-center w-full">
            <Input
              className={cn(FIELD_CLASS, "flex-1")}
              placeholder="Add Subtasks...."
              value={subtaskDraft}
              onChange={(e) => setSubtaskDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddSubtask();
                }
              }}
            />
            <Button type="button" className="gap-2 px-4 shrink-0" onClick={handleAddSubtask}>
              <Plus className="size-4" />
              Add
            </Button>
          </div>
        </div>
      </FormField>

      <FormField label="Notes" labelClassName={LABEL_CLASS}>
        <Textarea
          className="rounded-sm text-base font-medium min-h-24"
          placeholder="Type..."
          value={form.notes}
          onChange={(e) => setField("notes")(e.target.value)}
        />
      </FormField>

      <div className="border-t border-secondary flex justify-end gap-2 items-center pt-4 w-full">
        <Button variant="outline" className="gap-2 px-4" onClick={onClose}>
          <X className="size-4" />
          Cancel
        </Button>
        <Button className="gap-2 px-4" onClick={handleSubmit}>
          <Pencil className="size-4" />
          {editingTask ? "Save Changes" : "Add Task"}
        </Button>
      </div>
    </>
  );
}

export default function AddTaskDialog() {
  const open = useTasksStore((s) => s.addModalOpen);
  const editingTask = useTasksStore((s) => s.editingTask);
  const defaultStatus = useTasksStore((s) => s.addModalDefaultStatus);
  const closeAddModal = useTasksStore((s) => s.closeAddModal);
  const addTask = useTasksStore((s) => s.addTask);
  const updateTask = useTasksStore((s) => s.updateTask);

  const handleSubmit = (data) => {
    if (editingTask) {
      updateTask(editingTask.id, data);
    } else {
      addTask(data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && closeAddModal()}>
      <DialogContent className="sm:max-w-2xl rounded-2xl p-6 gap-4 max-h-[90vh] overflow-y-auto">
        {open && (
          <TaskForm
            key={editingTask?.id ?? "new"}
            editingTask={editingTask}
            defaultStatus={defaultStatus}
            onClose={closeAddModal}
            onSubmit={handleSubmit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
