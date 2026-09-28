import { describe, expect, it } from 'vitest';
import { TaskStatus } from '../../generated/prisma/enums.js';
import { checklistProgress, completionStamp, readChecklist, taskAttention } from './tasks.rules.js';

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const TODAY = day('2026-09-28');

describe('taskAttention', () => {
  it('is overdue before today and due today on today', () => {
    expect(taskAttention(day('2026-09-27'), TaskStatus.TODO, TODAY)).toBe('OVERDUE');
    expect(taskAttention(day('2026-09-28'), TaskStatus.IN_PROGRESS, TODAY)).toBe('DUE_TODAY');
  });

  it('says nothing about a future task, an undated one, or a completed one', () => {
    expect(taskAttention(day('2026-09-29'), TaskStatus.TODO, TODAY)).toBeNull();
    expect(taskAttention(null, TaskStatus.TODO, TODAY)).toBeNull();
    expect(taskAttention(day('2026-09-01'), TaskStatus.COMPLETED, TODAY)).toBeNull();
  });
});

describe('completionStamp', () => {
  const now = new Date('2026-09-28T15:00:00.000Z');

  it('stamps on completion and clears on reopening', () => {
    expect(completionStamp(TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED, now)).toBe(now);
    expect(completionStamp(TaskStatus.COMPLETED, TaskStatus.TODO, now)).toBeNull();
  });

  it('leaves the column alone when the status does not cross completion', () => {
    expect(completionStamp(TaskStatus.TODO, TaskStatus.IN_PROGRESS, now)).toBeUndefined();
    expect(completionStamp(TaskStatus.COMPLETED, TaskStatus.COMPLETED, now)).toBeUndefined();
    expect(completionStamp(TaskStatus.TODO, undefined, now)).toBeUndefined();
  });
});

describe('readChecklist', () => {
  it('keeps well-formed items and drops anything else', () => {
    const items = readChecklist([
      { id: 'a', text: 'Call the FBO', done: true },
      { id: 'b', text: 'Confirm catering' },
      'junk',
      null,
    ]);
    expect(items).toEqual([{ id: 'a', text: 'Call the FBO', done: true }]);
    expect(readChecklist({})).toEqual([]);
  });

  it('counts progress', () => {
    expect(
      checklistProgress([
        { id: 'a', text: 'x', done: true },
        { id: 'b', text: 'y', done: false },
      ]),
    ).toEqual({ done: 1, total: 2 });
  });
});
