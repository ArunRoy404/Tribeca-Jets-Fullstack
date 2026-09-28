import { formatCalendarDate } from "@/lib/date";
import { displayName } from "@/lib/client";
import { personName } from "@/lib/lead";
import { formatTripReference } from "@/lib/trip";
import { toArchiveFields } from "@/lib/archive";

/**
 * Display helpers for the Tasks Board (#20).
 *
 * "Overdue" and "Due today" come from the API's `attention`, worked out on
 * every read from the due date and status — never re-derived here, so the
 * card and the bell cannot disagree with the server about what is late.
 */

const DASH = "—";

/** The board's columns, in order, with their accent. */
export const TASK_COLUMNS = [
  { key: "TODO", label: "To Do", accentClassName: "bg-border" },
  { key: "IN_PROGRESS", label: "In Progress", accentClassName: "bg-info" },
  { key: "WAITING_ON_CLIENT", label: "Waiting on Client", accentClassName: "bg-info" },
  { key: "WAITING_ON_OPERATOR", label: "Waiting on Operator", accentClassName: "bg-purple" },
  { key: "COMPLETED", label: "Completed", accentClassName: "bg-success" },
];

export const TASK_STATUSES = TASK_COLUMNS.map((column) => column.key);
const STATUS_LABELS = Object.fromEntries(TASK_COLUMNS.map((column) => [column.key, column.label]));
export const formatTaskStatus = (status) => (status ? (STATUS_LABELS[status] ?? status) : DASH);

export const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const PRIORITY_LABELS = { LOW: "Low", MEDIUM: "Medium", HIGH: "High", URGENT: "Urgent" };
export const formatTaskPriority = (priority) => (priority ? (PRIORITY_LABELS[priority] ?? priority) : DASH);

/** The board's quick views; "Everyone" is no view at all, "Archived" the other half. */
export const TASK_VIEWS = ["MINE", "ALL", "DUE_TODAY", "OVERDUE", "HIGH_PRIORITY", "ARCHIVED"];
const VIEW_LABELS = {
  MINE: "My Tasks",
  ALL: "Everyone",
  DUE_TODAY: "Due Today",
  OVERDUE: "Overdue",
  HIGH_PRIORITY: "High priority",
  ARCHIVED: "Archived",
};
export const formatTaskView = (view) => VIEW_LABELS[view] ?? view;

const ATTENTION_LABELS = { OVERDUE: "Overdue", DUE_TODAY: "Due today" };

/** "TSK-1042", the way the desk says it. */
export function formatTaskReference(reference) {
  return reference === null || reference === undefined ? DASH : `TSK-${reference}`;
}

/** One task, as the card, the panel, the edit form and the bell read it. */
export function toTask(task) {
  const checklist = Array.isArray(task?.checklist) ? task.checklist : [];
  return {
    id: task?.id,
    reference: formatTaskReference(task?.reference),
    title: task?.title || DASH,
    description: task?.description ?? "",
    notes: task?.notes ?? "",
    status: task?.status ?? null,
    statusLabel: formatTaskStatus(task?.status),
    priority: task?.priority ?? null,
    priorityLabel: formatTaskPriority(task?.priority),
    dueDate: task?.dueDate ? String(task.dueDate).slice(0, 10) : "",
    dueLabel: task?.dueDate ? formatCalendarDate(task.dueDate) : "No due date",
    attention: task?.attention ?? null,
    attentionLabel: ATTENTION_LABELS[task?.attention] ?? null,
    assigneeId: task?.assigneeId ?? "",
    assignee: task?.assignee ? personName(task.assignee) : "Unassigned",
    clientId: task?.clientId ?? "",
    client: task?.client ? displayName(task.client) : null,
    tripId: task?.tripId ?? "",
    trip: task?.trip ? formatTripReference(task.trip.reference) : null,
    checklist,
    checklistDone: task?.checklistProgress?.done ?? checklist.filter((item) => item?.done).length,
    checklistTotal: task?.checklistProgress?.total ?? checklist.length,
    createdById: task?.createdById ?? null,
    createdBy: task?.createdBy ? personName(task.createdBy) : DASH,
    isArchived: Boolean(task?.deletedAt),
    ...toArchiveFields(task),
  };
}
