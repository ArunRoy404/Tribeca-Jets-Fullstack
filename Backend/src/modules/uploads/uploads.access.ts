import { isAdministrator } from '../../common/authorization/permissions.js';
import { UploadVisibility } from '../../generated/prisma/enums.js';
import type { UserRole } from '../../generated/prisma/enums.js';

/**
 * Who may open a stored file.
 *
 * Pure functions, in their own file, for one reason: this is the rule that
 * decides whether a broker can read another broker's 1099, and a rule that can
 * only be exercised by starting a server and logging in as three people is a
 * rule that quietly stops being exercised.
 *
 * The two exports must agree — `mayRead` answers for one row, `visibilityWhere`
 * answers for a `findMany`. They are side by side so that a change to one is a
 * visibly missing change to the other; a list that shows what a fetch refuses
 * is the same leak, arriving a page earlier.
 */

/** The fields any access decision needs. Deliberately the smallest set. */
export interface UploadAccessFacts {
  visibility: UploadVisibility;
  ownerUserId: string | null;
  uploadedById: string | null;
}

/** The caller, reduced to what matters here. */
export interface UploadActor {
  id: string;
  role: UserRole;
}

/**
 * Whether the caller reads every stored file: SUPER_ADMIN and ADMIN.
 *
 * The stored role, never the matrix switch or a per-person permission. This
 * used to go through the matrix, which answered SUPER_ADMIN for everyone
 * while role restrictions were switched off (4–7 Oct 2026) — so every broker
 * and assistant could open every private file, 1099s included. Who sees the
 * whole filing cabinet is a fact about the role, and must not be switchable.
 */
export function administersUsers(actor: UploadActor): boolean {
  return isAdministrator(actor.role);
}

/**
 * Whether `actor` may fetch these bytes.
 *
 * Three ways in and no fourth: the file is public, the caller put it there, or
 * it was filed about them. An administrator is added on top because somebody
 * has to be able to see what the company filed — normally the same person who
 * uploaded it.
 */
export function mayRead(actor: UploadActor, row: UploadAccessFacts): boolean {
  if (row.visibility === UploadVisibility.PUBLIC) return true;
  if (row.uploadedById === actor.id) return true;
  if (row.ownerUserId === actor.id) return true;
  return administersUsers(actor);
}

/**
 * Whether `actor` may remove or restore a file they can already read.
 *
 * Narrower than reading, on purpose: the uploader and an administrator, and
 * nobody else. Reading is wide — every signed-in user may open a PUBLIC
 * photo — and removing a file makes it stop serving everywhere its URL is
 * stored, so "may read" as the rule let any broker take the aircraft
 * photographs and brochures off every record that used them. The person a
 * document is filed about may read it but not remove it: Mark's 1099 is the
 * company's filing, not his upload.
 *
 * Asked only after `mayRead` passes, so a refusal here is a 403 — the caller
 * has already seen the file, and a 404 would protect nothing.
 */
export function mayManage(actor: UploadActor, row: UploadAccessFacts): boolean {
  return row.uploadedById === actor.id || administersUsers(actor);
}

/**
 * The `where` fragment expressing exactly the same three branches.
 *
 * An administrator gets `{}` — no clause — rather than a disjunction that
 * happens to match everything, because the empty object is what the query
 * planner wants and what a reader expects "no restriction" to look like.
 */
export function visibilityWhere(actor: UploadActor) {
  if (administersUsers(actor)) return {};
  return {
    OR: [
      { visibility: UploadVisibility.PUBLIC },
      { uploadedById: actor.id },
      { ownerUserId: actor.id },
    ],
  };
}
