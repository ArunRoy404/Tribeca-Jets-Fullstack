import { describe, expect, it, vi } from 'vitest';
import { resolveAccess } from '../../common/authorization/access.js';
import { TaskStatus, TaskSystemKind, UserRole } from '../../generated/prisma/enums.js';
import { TripsService } from './trips.service.js';

const user = { id: 'owner', email: 'owner@example.com', role: UserRole.SUPER_ADMIN,
  access: resolveAccess(UserRole.SUPER_ADMIN, null) };

function fixture() {
  const earlier = new Date('2026-11-19');
  const trips = ['first', 'second'].map((id, index) => ({ id, reference: index + 1, deletedAt: null as Date | null, deletedById: null as string | null }));
  const tasks: Array<{
    tripId: string;
    name: string;
    status: TaskStatus;
    systemKind: TaskSystemKind | null;
    deletedAt: Date | null;
    deletedById: string | null;
  }> = trips.flatMap(({ id: tripId }) => [
    { tripId, name: 'system', status: TaskStatus.TODO, systemKind: TaskSystemKind.TRIP_APPROVAL, deletedAt: null, deletedById: null },
    { tripId, name: 'manual', status: TaskStatus.TODO, systemKind: null, deletedAt: null, deletedById: null },
    { tripId, name: 'completed', status: TaskStatus.COMPLETED, systemKind: TaskSystemKind.TRIP_DECLINED, deletedAt: null, deletedById: null },
    { tripId, name: 'already archived', status: TaskStatus.TODO, systemKind: TaskSystemKind.TRIP_ASSIGNED, deletedAt: earlier, deletedById: user.id },
  ]);
  const sameStamp = (left: Date | null, right: Date | null) => left?.getTime() === right?.getTime();
  const tx = {
    trip: {
      findMany: vi.fn(({ where }) => trips.filter((row) => where.id.in.includes(row.id)
        && (where.deletedAt === null ? row.deletedAt === null : row.deletedAt !== null)).map((row) => ({ ...row }))),
      updateMany: vi.fn(({ where, data }) => {
        const row = trips.find((trip) => trip.id === where.id && sameStamp(trip.deletedAt, where.deletedAt));
        if (row) Object.assign(row, data);
        return { count: Number(Boolean(row)) };
      }),
    },
    task: {
      updateMany: vi.fn(({ where, data }) => {
        const affected = tasks.filter((task) => task.tripId === where.tripId && task.systemKind !== where.systemKind.not
          && sameStamp(task.deletedAt, where.deletedAt)
          && (!where.status || task.status !== where.status.not)
          && (where.deletedById === undefined || task.deletedById === where.deletedById));
        affected.forEach((task) => Object.assign(task, data));
        return { count: affected.length };
      }),
    },
  };
  const audit = { record: vi.fn() };
  const transaction = vi.fn((run: (client: typeof tx) => unknown) => run(tx));
  const service = new TripsService({ $transaction: transaction } as never, audit as never,
    {} as never, {} as never, {} as never, {} as never, {} as never);
  vi.spyOn(service, 'findOne').mockResolvedValue({} as never);
  return { service, transaction, audit, trips, tasks, tx, earlier };
}

describe('trip archive and restore tasks', () => {
  it.each([false, true])('uses the trip archive stamp on exactly its open system tasks (bulk: %s)', async (bulk) => {
    const { service, transaction, audit, trips, tasks, earlier } = fixture();
    const ids = bulk ? ['first', 'second'] : ['first'];
    if (bulk) await service.removeMany(user, ids);
    else await service.remove(user, ids[0]);
    expect(transaction).toHaveBeenCalledTimes(1);
    for (const task of tasks) {
      const trip = trips.find(({ id }) => id === task.tripId);
      if (task.name === 'already archived') expect(task.deletedAt).toEqual(earlier);
      else if (ids.includes(task.tripId) && task.name === 'system') {
        expect(task).toMatchObject({ deletedAt: trip?.deletedAt, deletedById: user.id, status: TaskStatus.TODO });
        expect(task.deletedAt).toBeInstanceOf(Date);
      } else expect(task.deletedAt).toBeNull();
    }
    expect(audit.record).toHaveBeenLastCalledWith(expect.objectContaining({
      action: bulk ? 'trip.bulk_archived' : 'trip.archived',
      metadata: expect.objectContaining({ tasksArchived: ids.length }),
    }));

    // A system task independently archived by someone else at the same instant
    // must stay archived. The original archive actor is part of the match.
    const unrelated = { ...tasks[0], name: 'another actor', deletedById: 'other' };
    tasks.push(unrelated);
    if (bulk) await service.restoreMany(user, ids);
    else await service.restore(user, ids[0]);
    expect(transaction).toHaveBeenCalledTimes(2);
    expect(tasks.filter((task) => task.name === 'system').every((task) => task.deletedAt === null)).toBe(true);
    expect(tasks.filter((task) => task.name === 'already archived').map((task) => task.deletedAt)).toEqual([earlier, earlier]);
    expect(unrelated.deletedAt).toBeInstanceOf(Date);
    expect(audit.record).toHaveBeenLastCalledWith(expect.objectContaining({
      action: bulk ? 'trip.bulk_restored' : 'trip.restored',
      metadata: expect.objectContaining({ tasksRestored: ids.length }),
    }));
  });
});
