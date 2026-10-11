"use client";

import NoAccessState from "@/components/common/NoAccessState";
import NotFoundState from "@/components/common/NotFoundState";
import TableStatus from "@/components/table/common/TableStatus";
import UserForm from "@/components/users-roles/UserForm";
import { useCurrentUser } from "@/hooks/auth";
import { useHydrated } from "@/hooks/common/useHydrated";
import { usePermissions } from "@/hooks/common/usePermissions";
import { useUser } from "@/hooks/users";
import { Action, Module } from "@/lib/access";
import { toTeamMember } from "@/lib/user";

/**
 * Invite a team member (no `userId`), or edit one.
 *
 * Waits for the session before deciding anything: whether the form may open
 * depends on the permissions, which the server render does not have — so
 * both passes show the loader and hydration matches. Inviting needs Users &
 * Roles · Invite users, editing needs Edit, and the owner's account is
 * editable only by the owner, the same rules the API applies.
 */
export default function UserFormPage({ userId = null }) {
  const hydrated = useHydrated();
  const { data: me, isPending: sessionPending } = useCurrentUser();
  const { canAccess } = usePermissions();
  const { data, isPending, error } = useUser(userId);

  if (!hydrated || sessionPending || (userId && isPending)) {
    return <TableStatus isLoading />;
  }
  if (userId && (error || !data)) {
    return (
      <NotFoundState
        itemType="Team member"
        backUrl="/dashboard/users-roles"
        backLabel="Back to Users & Roles"
      />
    );
  }

  const editingUser = data ? toTeamMember(data) : null;
  const allowed = editingUser
    ? canAccess(Module.USERS, Action.EDIT) && (editingUser.role !== "SUPER_ADMIN" || me?.role === "SUPER_ADMIN")
    : canAccess(Module.USERS, Action.CREATE);
  if (!allowed) return <NoAccessState module={Module.USERS} />;

  // Keyed so opening a different person starts a fresh form.
  return <UserForm key={editingUser?.id ?? "new"} editingUser={editingUser} />;
}
