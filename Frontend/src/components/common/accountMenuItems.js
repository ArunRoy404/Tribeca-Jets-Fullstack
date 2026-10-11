import { Settings, User } from "lucide-react";

/**
 * The profile menu's links, shared by the top-nav menu and the sidebar
 * footer so the two cannot offer different things.
 */
export const ACCOUNT_MENU_ITEMS = [
  { label: "My Account", icon: User, href: "/dashboard/account" },
  { label: "Settings", icon: Settings, href: "/dashboard/settings" },
];
