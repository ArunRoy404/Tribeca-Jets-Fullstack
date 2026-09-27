/**
 * The referral partner portal's navigation — client adjustment #11:
 *
 *   "The referral agent portal should only display:
 *    Dashboard | Submit Referral | My Referrals | Commissions | Resources"
 *
 * Five entries and nothing of the CRM's. Fed to the shared `AppSidebar` /
 * `NavMain`, which default to the CRM menu when given nothing.
 */

export const PORTAL_HOME = { label: "Dashboard", icon: "nav-dashboard", href: "/portal" };

export const PORTAL_SECTIONS = [
  {
    label: "Referral Portal",
    items: [
      { label: "Submit Referral", icon: "nav-quotes", href: "/portal/submit" },
      { label: "My Referrals", icon: "nav-leads-agents", href: "/portal/referrals" },
      { label: "Commissions", icon: "nav-commissions", href: "/portal/commissions" },
      { label: "Resources", icon: "nav-itineraries", href: "/portal/resources" },
    ],
  },
];

const TITLES = {
  "/portal": "Dashboard",
  "/portal/submit": "Submit Referral",
  "/portal/referrals": "My Referrals",
  "/portal/commissions": "Commissions",
  "/portal/resources": "Resources",
};

/** The header title for a portal path. */
export function portalTitleFor(pathname) {
  if (TITLES[pathname]) return TITLES[pathname];
  const match = Object.keys(TITLES)
    .filter((path) => path !== "/portal" && pathname?.startsWith(path))
    .sort((a, b) => b.length - a.length)[0];
  return match ? TITLES[match] : "Referral Portal";
}
