import { Injectable } from '@nestjs/common';
import {
  paginate,
  type AuthenticatedUser,
  type Paginated,
} from '../../common/types/api.types.js';
import { toPrismaPagination } from '../../common/dto/pagination.dto.js';
import { Permission, can } from '../../common/authorization/permissions.js';
import { mergePages } from '../../common/database/merge-pages.js';
import {
  MovementKind,
  movementOrder,
  type MovementFilter,
  type MovementSlice,
  type MovementTotals,
} from '../../common/money/movements.js';
import { ReceivablesService } from '../receivables/receivables.service.js';
import { OperatorPaymentsService } from '../operator-payments/operator-payments.service.js';
import { CommissionsService } from '../commissions/commissions.service.js';
import { kindsFor, ledgerTotals } from './transactions.ledger.js';
import type { QueryTransactionsInput, TransactionStatsInput } from './dto/transaction.dto.js';

/**
 * Transactions (#19) — the money ledger: every payment received on a client
 * invoice, every payment sent against an operator's bill, and every
 * commission paid, in one list by the day the money moved.
 *
 * **A view, not a table.** Nothing is stored here. Each kind is read from the
 * module that owns it, through that module's service and under its row-level
 * scope, and a kind the caller has no permission for is never read at all.
 * The page is merged with the shared `mergePages`, exactly as the notes
 * timeline is. Rows are read-only; each links back to the bill it settles,
 * where it is corrected or withdrawn.
 */
@Injectable()
export class TransactionsService {
  constructor(
    private readonly receivables: ReceivablesService,
    private readonly operatorPayments: OperatorPaymentsService,
    private readonly commissions: CommissionsService,
  ) {}

  /** The kinds this role may read, each by its own module's permission. */
  private permitted(user: AuthenticatedUser): Set<MovementKind> {
    const kinds = new Set<MovementKind>();
    if (can(user.role, Permission.VIEW_RECEIVABLES)) kinds.add(MovementKind.CLIENT_PAYMENT);
    if (can(user.role, Permission.VIEW_OPERATOR_PAYMENTS)) kinds.add(MovementKind.OPERATOR_PAYMENT);
    if (can(user.role, Permission.VIEW_COMMISSIONS)) kinds.add(MovementKind.COMMISSION);
    return kinds;
  }

  private sliceOf(kind: MovementKind, user: AuthenticatedUser, filter: MovementFilter, take: number): Promise<MovementSlice> {
    switch (kind) {
      case MovementKind.CLIENT_PAYMENT:
        return this.receivables.movements(user, filter, take);
      case MovementKind.OPERATOR_PAYMENT:
        return this.operatorPayments.movements(user, filter, take);
      default:
        return this.commissions.movements(user, filter, take);
    }
  }

  private totalsOf(kind: MovementKind, user: AuthenticatedUser, filter: MovementFilter): Promise<MovementTotals> {
    switch (kind) {
      case MovementKind.CLIENT_PAYMENT:
        return this.receivables.movementTotals(user, filter);
      case MovementKind.OPERATOR_PAYMENT:
        return this.operatorPayments.movementTotals(user, filter);
      default:
        return this.commissions.movementTotals(user, filter);
    }
  }

  async findAll(user: AuthenticatedUser, query: QueryTransactionsInput): Promise<Paginated<unknown>> {
    const { skip, take } = toPrismaPagination(query);
    const filter: MovementFilter = {
      from: query.from,
      to: query.to,
      tripId: query.tripId,
      search: query.search,
      order: query.sortOrder,
    };
    const kinds = kindsFor(this.permitted(user), query.kind, query.direction);
    // Each source's first `skip + take` rows cover the page exactly (see mergePages).
    const slices = await Promise.all(kinds.map((kind) => this.sliceOf(kind, user, filter, skip + take)));
    const rows = mergePages(
      slices.map((slice) => slice.rows),
      skip,
      take,
      movementOrder(query.sortOrder),
    );
    const total = slices.reduce((sum, slice) => sum + slice.total, 0);
    return paginate(rows, total, query.page, query.limit);
  }

  /** Money in, money out and the net over the same filters, summed in cents. */
  async stats(user: AuthenticatedUser, query: TransactionStatsInput) {
    const filter: MovementFilter = {
      from: query.from,
      to: query.to,
      tripId: query.tripId,
      search: query.search,
      order: 'desc',
    };
    const permitted = this.permitted(user);
    const kinds = kindsFor(permitted, query.kind, query.direction);
    const results = await Promise.all(kinds.map((kind) => this.totalsOf(kind, user, filter)));
    return ledgerTotals(Object.fromEntries(kinds.map((kind, i) => [kind, results[i]])), permitted);
  }
}
