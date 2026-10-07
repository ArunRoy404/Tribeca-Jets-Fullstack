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
import { CRM_HOME, CRM_SECTIONS } from "@/components/dashboard/nav/crmNav";
import { usePermissions } from "@/hooks/common/usePermissions";

/**
 * The sidebar's links: a home entry, then collapsible sections.
 *
 * Both are optional and default to the CRM's, so the dashboard renders exactly
 * as before; the partner portal (#11) passes its own five items. One menu
 * component for both shells, rather than a second copy of this markup.
 *
 * An item that names a `module` is shown only to someone who may view it, and
 * a section left empty is not shown at all (7 Oct 2026). Items without one —
 * the portal's — always show.
 */
export function NavMain({ home = CRM_HOME, sections = CRM_SECTIONS }) {
  const pathname = usePathname();
  const { canAccess } = usePermissions();
  const visible = (item) => !item?.module || canAccess(item.module);
  const shownSections = sections
    .map((section) => ({ ...section, items: section.items.filter(visible) }))
    .filter((section) => section.items.length);
  const isDashboardActive = pathname === home.href;
  const { isMobile, state, setOpenMobile } = useSidebar();
  const isCollapsed = state === "collapsed" && !isMobile;

  const closeOnMobile = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <>
      {visible(home) && (
        <SidebarMenu className={`px-2 pt-2 ${isCollapsed ? "!p-0" : ""}`}>
          <SidebarMenuItem className={isCollapsed ? "flex justify-center" : ""}>
            <SidebarMenuButton
              isActive={isDashboardActive}
              render={<Link href={home.href} />}
              onClick={closeOnMobile}
              className="data-active:border-y data-active:border-white data-active:bg-sidebar-primary/15 data-active:text-white hover:bg-sidebar-primary/20"
            >
              <Image src={`/dashboard/icons/${home.icon}.svg`} alt="" width={20} height={20} className="shrink-0" />
              {!isCollapsed && <span>{home.label}</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      )}

      {shownSections.map((section) => (
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
