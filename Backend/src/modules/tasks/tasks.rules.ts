import { TaskStatus } from '../../generated/prisma/enums.js';

/**
 * The Tasks Board's (#20) arithmetic, as pure functions with tests.
 *
 * "Overdue" and "due today" are worked out from the due date and the status
 * on every read, never stored — a stored flag is wrong from midnight until
 * something rewrites it (AGENTS.md, "a computed state is filtered by
 * computing it").
 */

export const TaskAttention = {
  OVERDUE: 'OVERDUE',
  DUE_TODAY: 'DUE_TODAY',
} as const;
export type TaskAttention = (typeof TaskAttention)[keyof typeof TaskAttention];

/**
 * Whether a task needs looking at today. A completed task never does, and a
 * task with no due date is never late. `today` is a calendar day at midnight
 * UTC, the same shape a `@db.Date` column reads back as.
 */
export function taskAttention(
  dueDate: Date | null,
  status: TaskStatus,
  today: Date,
): TaskAttention | null {
  if (!dueDate || status === TaskStatus.COMPLETED) return null;
  if (dueDate.getTime() < today.getTime()) return TaskAttention.OVERDUE;
  if (dueDate.getTime() === today.getTime()) return TaskAttention.DUE_TODAY;
  return null;
}

/**
 * What `completedAt` becomes when a task's status moves: stamped the moment
 * it reaches COMPLETED, kept while it stays there, cleared if it is reopened.
 * `undefined` means "leave the column alone".
 */
export function completionStamp(
  from: TaskStatus,
  to: TaskStatus | undefined,
  now: Date,
): Date | null | undefined {
  if (to === undefined || to === from) return undefined;
  if (to === TaskStatus.COMPLETED) return now;
  if (from === TaskStatus.COMPLETED) return null;
  return undefined;
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

/**
 * A stored checklist, read defensively: the column is JSON, so anything that
 * is not an item of the right shape is dropped rather than rendered.
 */
export function readChecklist(value: unknown): ChecklistItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is ChecklistItem =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as ChecklistItem).id === 'string' &&
      typeof (item as ChecklistItem).text === 'string' &&
      typeof (item as ChecklistItem).done === 'boolean',
  );
}

/** "2 of 5 done" — counted, never stored. */
export function checklistProgress(items: ChecklistItem[]): { done: number; total: number } {
  return { done: items.filter((item) => item.done).length, total: items.length };
}
