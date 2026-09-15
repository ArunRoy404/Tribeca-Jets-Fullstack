/**
 * Display helpers for the authenticated user.
 *
 * The API returns roles as enum constants (`SUPER_ADMIN`); the UI shows them as
 * words. Kept here rather than in a component so the users-and-roles screens
 * label them identically to the nav.
 */

const ROLE_LABELS = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  BROKER: "Broker",
  ASSISTANT: "Assistant",
};

export function formatUserRole(role) {
  if (!role) return "";
  return ROLE_LABELS[role] ?? role;
}

export function getFullName(user) {
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ");
  return name || user?.email || "";
}

/**
 * Maps the API's user onto the props the nav components render.
 *
 * Both the top-nav menu and the sidebar footer show the same identity, so the
 * mapping lives here rather than being re-derived in each.
 */
export function toDisplayUser(user, { isLoading = false } = {}) {
  return {
    // Placeholder only while the first request is in flight, so the nav does
    // not collapse to an empty row on load.
    name: isLoading ? "Loading…" : getFullName(user),
    role: formatUserRole(user?.role),
    avatarUrl: user?.avatarUrl ?? null,
  };
}

export function getInitials(user) {
  const first = user?.firstName?.[0] ?? "";
  const last = user?.lastName?.[0] ?? "";
  return (first + last).toUpperCase() || user?.email?.[0]?.toUpperCase() || "";
}
