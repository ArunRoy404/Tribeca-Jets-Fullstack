import { describe, expect, it, vi } from 'vitest';
import { resolveAccess } from '../../common/authorization/access.js';
import { TaskStatus, TaskSystemKind, UserRole } from '../../generated/prisma/enums.js';
import { createTaskSchema, updateTaskSchema } from './dto/task.dto.js';
import { TasksService } from './tasks.service.js';

describe('task system kind', () => {
  it('keeps systemKind out of persisted create and update data', async () => {
    const user = { id: 'owner', email: 'owner@example.com', role: UserRole.SUPER_ADMIN,
      access: resolveAccess(UserRole.SUPER_ADMIN, null) };
    const task = {
      findFirst: vi.fn().mockResolvedValue({ id: 'task', status: TaskStatus.TODO, dueDate: null, checklist: [] }),
      create: vi.fn().mockResolvedValue({ id: 'task', reference: 1 }),
      update: vi.fn(),
    };
    const service = new TasksService({ task } as never, { record: vi.fn() } as never, {} as never, {} as never);
    await service.create(user, createTaskSchema.parse({
      title: 'Approve Trip TJ-42', systemKind: TaskSystemKind.TRIP_APPROVAL,
    }));
    await service.update(user, 'task', updateTaskSchema.parse({
      title: 'New title', systemKind: TaskSystemKind.TRIP_DECLINED,
    }));
    expect(task.create.mock.calls[0][0].data).toMatchObject({ title: 'Approve Trip TJ-42' });
    expect(task.create.mock.calls[0][0].data).not.toHaveProperty('systemKind');
    expect(task.update.mock.calls[0][0].data).toMatchObject({ title: 'New title' });
    expect(task.update.mock.calls[0][0].data).not.toHaveProperty('systemKind');
  });
});
