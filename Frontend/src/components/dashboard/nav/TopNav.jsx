"use client";

import { usePathname } from "next/navigation";
import UserMenu from "@/components/common/UserMenu";
import NotificationPopover from "@/components/common/NotificationPopover";
import { SidebarTrigger } from "@/components/ui/sidebar";

const routeNameMap = {
  "/dashboard": "Dashboard",
  "/dashboard/trips": "Trips",
  "/dashboard/trips/new": "New Trip",
  "/dashboard/schedule": "Schedule",
  "/dashboard/operator-sourcing": "Operators Sourcing",
  "/dashboard/flight-tracking": "Flight Tracking",
  "/dashboard/itineraries": "Itineraries",
  "/dashboard/empty-legs": "Empty Legs",
  "/dashboard/clients": "Clients",
  "/dashboard/leads-agents": "Leads & Agents",
  "/dashboard/quotes": "Quotes",
  "/dashboard/email-templates": "Email Templates",
  "/dashboard/operators": "Operators",
  "/dashboard/aircraft": "Aircraft",
  "/dashboard/airports": "Airports",
  "/dashboard/receivables": "Receivables",
  "/dashboard/operator-payments": "Operator Payments",
  "/dashboard/commissions": "Commissions",
  "/dashboard/transactions": "Transactions",
  "/dashboard/reports": "Reports",
  "/dashboard/tasks-board": "Tasks Board",
  "/dashboard/users-roles": "Users & Roles",
  "/dashboard/settings": "Settings",
};

function getRouteTitle(pathname) {
  if (!pathname) return "Dashboard";

  if (routeNameMap[pathname]) {
    return routeNameMap[pathname];
  }

  if (pathname?.startsWith("/dashboard/trips/")) return "Trip Details";
  if (pathname?.startsWith("/dashboard/quotes/")) return "Quote Details";
  if (pathname?.startsWith("/dashboard/operators/")) return "Operator Details";
  if (pathname?.startsWith("/dashboard/leads-agents/leads/")) return "Lead Details";
  if (pathname?.startsWith("/dashboard/leads-agents/")) return "Agent Details";
  if (pathname?.startsWith("/dashboard/clients/")) return "Client Details";
  if (pathname?.startsWith("/dashboard/aircraft/")) return "Aircraft Details";

  const matchedRoute = Object.keys(routeNameMap)
    .filter((route) => route !== "/dashboard" && pathname?.startsWith(route))
    .sort((a, b) => b.length - a.length)[0];

  if (matchedRoute) {
    return routeNameMap[matchedRoute];
  }

  const segments = pathname.split("/").filter(Boolean);
  const lastSegment = segments[segments.length - 1] || "Dashboard";
  return lastSegment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function TopNav({ user }) {
  const pathname = usePathname();
  const routeTitle = getRouteTitle(pathname);

  return (
    <header className="sticky top-0 z-30 bg-sidebar border-b border-sidebar-border px-3 sm:px-6 py-2.5 sm:py-3 w-full flex items-center justify-between gap-3 sm:gap-6 text-white h-[57px] sm:h-[65px] min-h-[57px] sm:min-h-[65px]">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <SidebarTrigger className="text-white hover:bg-white/10 shrink-0" />
        <h1 className="text-base sm:text-lg md:text-xl font-semibold text-white truncate min-w-0">
          {routeTitle}
        </h1>
      </div>
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        <NotificationPopover />
        <UserMenu name={user?.name} role={user?.role} avatarUrl={user?.avatarUrl} />
      </div>
    </header>
  );
}

