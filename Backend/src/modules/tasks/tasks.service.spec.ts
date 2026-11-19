import { expect, it, vi } from 'vitest';
import { resolveAccess } from '../../common/authorization/access.js';
import { TaskStatus, UserRole } from '../../generated/prisma/enums.js';
import { queryTasksSchema } from './dto/task.dto.js';
import { TasksService } from './tasks.service.js';

it('filters COMPLETED tasks out of OPEN before counting and paging, even for undated work', async () => {
  const rows = [
    { id: 'done', status: TaskStatus.COMPLETED, dueDate: new Date('2026-11-19'), deletedAt: null, checklist: [] },
    { id: 'open', status: TaskStatus.TODO, dueDate: null, deletedAt: null, checklist: [] },
  ];
  const where = { AND: [{ deletedAt: null }, {}, {}, { status: { not: TaskStatus.COMPLETED } }, {}] };
  const findMany = vi.fn(async ({ where: filter, take }: { where: typeof where; take: number }) => {
    expect(filter).toEqual(where);
    return rows.filter((row) => row.status !== TaskStatus.COMPLETED).slice(0, take);
  });
  const count = vi.fn(async ({ where: filter }: { where: typeof where }) => {
    expect(filter).toEqual(where);
    return 1;
  });
  const service = new TasksService({ task: { findMany, count } } as never, {} as never, {} as never, {} as never);
  const user = { id: 'owner', email: 'owner@example.com', role: UserRole.SUPER_ADMIN, access: resolveAccess(UserRole.SUPER_ADMIN, null) };

  const page = await service.findAll(user, queryTasksSchema.parse({ view: 'OPEN', limit: 1 }));
  expect(findMany).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ skip: 0, take: 1 }));
  expect(count).toHaveBeenCalledTimes(1);
  expect(page.items).toEqual([expect.objectContaining({ id: 'open', status: TaskStatus.TODO, dueDate: null })]);
  expect(page.meta.total).toBe(1);
});
