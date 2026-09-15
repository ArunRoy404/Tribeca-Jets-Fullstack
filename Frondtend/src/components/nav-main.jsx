"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const navSections = [
  {
    label: "Operations",
    items: [
      { label: "Trips", icon: "nav-trips", href: "/dashboard/trips" },
      { label: "Schedule", icon: "nav-schedule", href: "/dashboard/schedule" },
      { label: "Operators Sourcing", icon: "nav-operators-sourcing", href: "/dashboard/operator-sourcing" },
      { label: "Flight Tracking", icon: "nav-flight-tracking", href: "/dashboard/flight-tracking" },
      { label: "Itineraries", icon: "nav-itineraries", href: "/dashboard/itineraries" },
      { label: "Empty Legs", icon: "nav-empty-legs", href: "/dashboard/empty-legs" },
    ],
  },
  {
    label: "Sales & CRM",
    items: [
      { label: "Clients", icon: "nav-clients", href: "/dashboard/clients" },
      { label: "Leads & Agents", icon: "nav-leads-agents", href: "/dashboard/leads-agents" },
      { label: "Quotes", icon: "nav-quotes", href: "/dashboard/quotes" },
      { label: "Email Templates", icon: "nav-email-templates", href: "/dashboard/email-templates" },
    ],
  },
  {
    label: "Database",
    items: [
      { label: "Operators", icon: "nav-operators-sourcing", href: "/dashboard/operators" },
      { label: "Aircraft", icon: "nav-flight-tracking", href: "/dashboard/aircraft" },
      { label: "Airports", icon: "nav-airports", href: "/dashboard/airports" },
    ],
  },
  {
    label: "Finance",
    items: [
      { label: "Receivables", icon: "nav-receivables", href: "/dashboard/receivables" },
      { label: "Operator Payments", icon: "nav-operator-payments", href: "/dashboard/operator-payments" },
      { label: "Commissions", icon: "nav-commissions", href: "/dashboard/commissions" },
      { label: "Transactions", icon: "nav-transactions", href: "/dashboard/transactions" },
    ],
  },
  {
    label: "Reports",
    items: [{ label: "Reports", icon: "nav-reports", href: "/dashboard/reports" }],
  },
  {
    label: "System",
    items: [
      { label: "Tasks Board", icon: "nav-tasks-board", href: "/dashboard/tasks-board" },
      { label: "Users & Roles", icon: "nav-users-roles", href: "/dashboard/users-roles" },
      { label: "Settings", icon: "nav-settings", href: "/dashboard/settings" },
    ],
  },
];

export function NavMain() {
  const pathname = usePathname();
  const isDashboardActive = pathname === "/dashboard";
  const { isMobile, state, setOpenMobile } = useSidebar();
  const isCollapsed = state === "collapsed" && !isMobile;

  const closeOnMobile = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <>
      <SidebarMenu className={`px-2 pt-2 ${isCollapsed ? "!p-0" : ""}`}>
        <SidebarMenuItem className={isCollapsed ? "flex justify-center" : ""}>
          <SidebarMenuButton
            isActive={isDashboardActive}
            render={<Link href="/dashboard" />}
            onClick={closeOnMobile}
            className="data-active:border-y data-active:border-white data-active:bg-sidebar-primary/15 data-active:text-white hover:bg-sidebar-primary/20"
          >
            <Image src="/dashboard/icons/nav-dashboard.svg" alt="" width={20} height={20} className="shrink-0" />
            {!isCollapsed && <span>Dashboard</span>}
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>

      {navSections.map((section) => (
        <Collapsible key={section.label} defaultOpen className="group/collapsible">
          <SidebarGroup className={isCollapsed ? "!p-0" : ""}>
            {!isCollapsed && (
              <CollapsibleTrigger
                nativeButton={false}
                className="w-full"
                render={
                  <SidebarGroupLabel className="cursor-pointer text-sm text-sidebar-foreground hover:text-white" />
                }
              >
                {section.label}
                <ChevronDown className="ml-auto size-4 transition-transform group-data-open/collapsible:rotate-180" />
              </CollapsibleTrigger>
            )}
            <CollapsibleContent className={isCollapsed ? "!block" : ""}>
              <SidebarGroupContent>
                <SidebarMenu>
                  {section.items.map((item) => {
                    const isActive = item.href !== "#" && pathname?.startsWith(item.href);
                    return (
                      <SidebarMenuItem key={item.label} className={isCollapsed ? "flex justify-center" : ""}>
                        <SidebarMenuButton
                          isActive={isActive}
                          render={<Link href={item.href} />}
                          onClick={closeOnMobile}
                          className="data-active:border-y data-active:border-white data-active:bg-sidebar-primary/15 data-active:text-white"
                        >
                          <Image src={`/dashboard/icons/${item.icon}.svg`} alt="" width={20} height={20} className="shrink-0" />
                          {!isCollapsed && <span>{item.label}</span>}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      ))}
    </>
  );
}
