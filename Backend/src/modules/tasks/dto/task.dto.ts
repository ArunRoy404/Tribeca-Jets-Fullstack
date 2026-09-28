import { z } from 'zod';
import { createZodDto } from '../../../common/dto/zod-dto.js';
import { calendarDate } from '../../../common/dto/dates.js';
import { paginationSchema, sortableBy } from '../../../common/dto/pagination.dto.js';
import { archiveQuerySchema } from '../../../common/database/archive.js';
import { TaskPriority, TaskStatus } from '../../../generated/prisma/enums.js';

/** One subtask. The id is the browser's own, so an edit keeps each item. */
const checklistItem = z.object({
  id: z.string().trim().min(1).max(64),
  text: z.string().trim().min(1, 'A checklist item needs some text').max(300),
  done: z.boolean(),
});
const checklist = z.array(checklistItem).max(50, 'At most 50 checklist items');

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, 'Give the task a title').max(200),
  description: z.string().trim().max(5000).optional(),
  status: z.enum(TaskStatus).default(TaskStatus.TODO),
  priority: z.enum(TaskPriority).default(TaskPriority.MEDIUM),
  dueDate: calendarDate.optional(),
  /** A staff member; absent leaves it unassigned. */
  assigneeId: z.uuid().optional(),
  /** A client and a trip the caller may see. Both optional. */
  clientId: z.uuid().optional(),
  tripId: z.uuid().optional(),
  checklist: checklist.default([]),
  notes: z.string().trim().max(5000).optional(),
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export class CreateTaskDto extends createZodDto(createTaskSchema) {}

/**
 * Written out rather than `.partial()` (AGENTS.md): every field optional,
 * none defaulted, and `null` clears what can be cleared. A status move rides
 * on the same PATCH — a task board has no lifecycle to guard, any column to
 * any column — and stamps `completedAt` on the way into COMPLETED.
 */
export const updateTaskSchema = z.object({
  title: z.string().trim().min(1, 'Give the task a title').max(200).optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  status: z.enum(TaskStatus).optional(),
  priority: z.enum(TaskPriority).optional(),
  dueDate: calendarDate.nullable().optional(),
  assigneeId: z.uuid().nullable().optional(),
  clientId: z.uuid().nullable().optional(),
  tripId: z.uuid().nullable().optional(),
  /** The full list when sent — an item left out is removed. */
  checklist: checklist.optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
});
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export class UpdateTaskDto extends createZodDto(updateTaskSchema) {}

/**
 * The board's quick views. MINE is assigned to the caller; DUE_TODAY and
 * OVERDUE are worked out from the due date and exclude completed work;
 * HIGH_PRIORITY is HIGH or URGENT; ATTENTION — the notification bell's — is
 * due today or overdue. Absent: everything the caller may see.
 */
export const TASK_VIEWS = ['MINE', 'DUE_TODAY', 'OVERDUE', 'HIGH_PRIORITY', 'ATTENTION'] as const;
export type TaskView = (typeof TASK_VIEWS)[number];

export const TASK_SORTABLE_FIELDS = ['dueDate', 'createdAt', 'updatedAt', 'priority', 'reference'] as const;

export const queryTasksSchema = paginationSchema
  .extend({
    view: z.enum(TASK_VIEWS).optional(),
    status: z.enum(TaskStatus).optional(),
    priority: z.enum(TaskPriority).optional(),
    assigneeId: z.uuid().optional(),
    clientId: z.uuid().optional(),
    tripId: z.uuid().optional(),
    /**
     * The day the views count as today — the browser's own date, so a desk in
     * New York at 9pm is not told tomorrow's work is due. Default today in UTC.
     */
    on: calendarDate.optional(),
    /**
     * A board reads soonest first — so, unlike every table, it opens by due
     * date ascending, undated work last. A stated exception to newest-first.
     */
    sortBy: sortableBy(TASK_SORTABLE_FIELDS, 'dueDate'),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
  })
  .merge(archiveQuerySchema);
export type QueryTasksInput = z.infer<typeof queryTasksSchema>;
export class QueryTasksDto extends createZodDto(queryTasksSchema) {}
