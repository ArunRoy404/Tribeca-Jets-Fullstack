"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useTasksStore } from "@/store/useTasksStore";
import { useCreateTask, useTask, useUpdateTask } from "@/hooks/tasks";
import { useUsers } from "@/hooks/users";
import { useClients } from "@/hooks/clients";
import { useTrips } from "@/hooks/trips";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import FormField from "@/components/trips/FormField";
import PickerSelect from "@/components/trips/PickerSelect";
import DatePicker from "@/components/common/DatePicker";
import { optionalText } from "@/lib/form";
import { TASK_COLUMNS, TASK_PRIORITIES, formatTaskPriority, toTask } from "@/lib/task";
import { displayName } from "@/lib/client";
import { personName } from "@/lib/lead";
import { formatTripReference } from "@/lib/trip";
import { cn } from "@/lib/utils";

const FIELD_CLASS = "h-13 px-4 rounded-sm text-base font-medium";
const LABEL_CLASS = "text-[16px] text-foreground mb-2";
const NONE = "__none__";

const STATUS_OPTIONS = TASK_COLUMNS.map((column) => ({ value: column.key, label: column.label }));
const PRIORITY_OPTIONS = TASK_PRIORITIES.map((value) => ({ value, label: formatTaskPriority(value) }));

/** A picked id, or — for "none" — nothing on create and null (clear) on edit. */
const pickedId = (value, editing) => (value && value !== NONE ? value : editing ? null : undefined);

/**
 * The pickers, from the API. Anyone on staff can be given a task — a
 * suspended account and the referral agent cannot, and are left off, the same
 * rule the API applies. Client and trip are real records, never a typed name.
 */
function useTaskFormOptions() {
  const { data: users } = useUsers({ limit: 100 });
  const { data: clients } = useClients({ limit: 100 });
  const { data: trips } = useTrips({ limit: 100, sortBy: "departureDate", sortOrder: "desc" });
  return useMemo(
    () => ({
      assignees: [
        { value: NONE, label: "Unassigned" },
        ...(users?.data ?? [])
          .filter((u) => u?.role !== "REFERRAL_AGENT" && u?.status !== "SUSPENDED")
          .map((u) => ({ value: u.id, label: personName(u) })),
      ],
      clients: [
        { value: NONE, label: "No client" },
        ...(clients?.data ?? []).map((c) => ({ value: c.id, label: displayName(c) })),
      ],
      trips: [
        { value: NONE, label: "No trip" },
        ...(trips?.data ?? []).map((t) => ({
          value: t.id,
          label: [formatTripReference(t.reference), t.client ? displayName(t.client) : null].filter(Boolean).join(" · "),
        })),
      ],
    }),
    [users?.data, clients?.data, trips?.data],
  );
}

function TaskForm({ task, defaultStatus, onClose }) {
  const editing = Boolean(task);
  const options = useTaskFormOptions();
  const { mutate: createTask, isPending: creating } = useCreateTask();
  const { mutate: updateTask, isPending: updating } = useUpdateTask();
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState(() => ({
    title: task?.title ?? "",
    description: task?.description ?? "",
    status: task?.status ?? defaultStatus,
    priority: task?.priority ?? "MEDIUM",
    assigneeId: task?.assigneeId || NONE,
    dueDate: task?.dueDate ?? "",
    clientId: task?.clientId || NONE,
    tripId: task?.tripId || NONE,
    checklist: task?.checklist ?? [],
    notes: task?.notes ?? "",
  }));
  const [subtaskDraft, setSubtaskDraft] = useState("");

  const setField = (field) => (value) => setForm((prev) => ({ ...prev, [field]: value }));

  const addSubtask = () => {
    const text = subtaskDraft.trim();
    if (!text) return;
    setForm((prev) => ({
      ...prev,
      checklist: [...prev.checklist, { id: crypto.randomUUID(), text, done: false }],
    }));
    setSubtaskDraft("");
  };

  const removeSubtask = (id) =>
    setForm((prev) => ({ ...prev, checklist: prev.checklist.filter((item) => item?.id !== id) }));

  const submit = () => {
    const payload = {
      title: form.title.trim(),
      description: optionalText(form.description, { editing }),
      status: form.status,
      priority: form.priority,
      dueDate: form.dueDate || (editing ? null : undefined),
      assigneeId: pickedId(form.assigneeId, editing),
      clientId: pickedId(form.clientId, editing),
      tripId: pickedId(form.tripId, editing),
      checklist: form.checklist,
      notes: optionalText(form.notes, { editing }),
    };
    const handlers = { onSuccess: onClose, onError: (error) => setErrors(error?.fieldErrors ?? {}) };
    if (editing) updateTask({ id: task.id, ...payload }, handlers);
    else createTask(payload, handlers);
  };

  return (
    <>
      <div className="border-b border-secondary flex items-start justify-between gap-4 pb-4 w-full">
        <DialogTitle className="font-montserrat font-bold text-[20px] text-black-text leading-none">
          {editing ? `Edit ${task.reference}` : "Add Task"}
        </DialogTitle>
      </div>

      <FormField label="Title" labelClassName={LABEL_CLASS} error={errors.title}>
        <Input className={FIELD_CLASS} placeholder="Type.." value={form.title} onChange={(e) => setField("title")(e.target.value)} />
      </FormField>

      <FormField label="Description (Optional)" labelClassName={LABEL_CLASS} error={errors.description}>
        <Textarea
          className="rounded-sm text-base font-medium min-h-24"
          placeholder="Type..."
          value={form.description}
          onChange={(e) => setField("description")(e.target.value)}
        />
      </FormField>

      <div className="flex flex-col sm:flex-row gap-4 items-start w-full">
        <FormField label="Status" labelClassName={LABEL_CLASS} className="flex-1 min-w-0" error={errors.status}>
          <PickerSelect value={form.status} onChange={setField("status")} options={STATUS_OPTIONS} placeholder="Select" className={FIELD_CLASS} />
        </FormField>
        <FormField label="Priority" labelClassName={LABEL_CLASS} className="flex-1 min-w-0" error={errors.priority}>
          <PickerSelect value={form.priority} onChange={setField("priority")} options={PRIORITY_OPTIONS} placeholder="Select" className={FIELD_CLASS} />
        </FormField>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start w-full">
        <FormField label="Assign To (Optional)" labelClassName={LABEL_CLASS} className="flex-1 min-w-0" error={errors.assigneeId}>
          <PickerSelect value={form.assigneeId} onChange={setField("assigneeId")} options={options.assignees} placeholder="Select" className={FIELD_CLASS} />
        </FormField>
        <FormField label="Due date (Optional)" labelClassName={LABEL_CLASS} className="flex-1 min-w-0" error={errors.dueDate}>
          <DatePicker className={FIELD_CLASS} value={form.dueDate} onChange={setField("dueDate")} placeholder="Choose Date" />
        </FormField>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start w-full">
        <FormField label="Client (Optional)" labelClassName={LABEL_CLASS} className="flex-1 min-w-0" error={errors.clientId}>
          <PickerSelect value={form.clientId} onChange={setField("clientId")} options={options.clients} placeholder="Select" className={FIELD_CLASS} />
        </FormField>
        <FormField label="Trip (Optional)" labelClassName={LABEL_CLASS} className="flex-1 min-w-0" error={errors.tripId}>
          <PickerSelect value={form.tripId} onChange={setField("tripId")} options={options.trips} placeholder="Select" className={FIELD_CLASS} />
        </FormField>
      </div>

      <FormField label="Checklist / Subtasks (Optional)" labelClassName={LABEL_CLASS} error={errors.checklist}>
        <div className="flex flex-col gap-2 w-full">
          {form.checklist.map((item) => (
            <div key={item?.id} className="flex items-center gap-2.5 bg-secondary rounded-sm p-2 w-full">
              <Checkbox checked={Boolean(item?.done)} disabled />
              <span className="flex-1 font-montserrat font-medium text-[14px] text-slate">{item?.text}</span>
              <button
                type="button"
                onClick={() => removeSubtask(item?.id)}
                aria-label="Remove this item"
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
                  addSubtask();
                }
              }}
            />
            <Button type="button" className="gap-2 px-4 shrink-0" onClick={addSubtask}>
              <Plus className="size-4" />
              Add
            </Button>
          </div>
        </div>
      </FormField>

      <FormField label="Notes (Optional)" labelClassName={LABEL_CLASS} error={errors.notes}>
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
        <Button className="gap-2 px-4" onClick={submit} disabled={creating || updating || !form.title.trim()}>
          <Pencil className="size-4" />
          {editing ? "Save Changes" : "Add Task"}
        </Button>
      </div>
    </>
  );
}

export default function AddTaskDialog() {
  const open = useTasksStore((s) => s.addModalOpen);
  const editingTaskId = useTasksStore((s) => s.editingTaskId);
  const defaultStatus = useTasksStore((s) => s.addModalDefaultStatus);
  const closeAddModal = useTasksStore((s) => s.closeAddModal);
  const { data } = useTask(editingTaskId);
  const task = editingTaskId && data ? toTask(data) : null;
  // An edit waits for the task to load, so the form never opens blank and posts the blanks back.
  const ready = !editingTaskId || Boolean(task);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && closeAddModal()}>
      <DialogContent className="sm:max-w-2xl rounded-2xl p-6 gap-4 max-h-[90vh] overflow-y-auto">
        {open && ready && (
          <TaskForm key={editingTaskId ?? "new"} task={task} defaultStatus={defaultStatus} onClose={closeAddModal} />
        )}
      </DialogContent>
    </Dialog>
  );
}
