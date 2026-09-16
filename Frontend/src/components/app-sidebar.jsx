"use client";

import Logo from "@/components/common/Logo";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";

function AppSidebarContent(props) {
  const { state, isMobile } = useSidebar();
  const isCollapsed = state === "collapsed" && !isMobile;

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="h-[57px] sm:h-[65px] shrink-0 items-center justify-center border-b border-sidebar-border px-3 sm:px-6 py-0">
        {isCollapsed ? (
          <Logo src="/dashboard/img/logo_icon.svg" className="h-6 w-auto object-contain" />
        ) : (
          <Logo className="h-7 sm:h-9 w-auto object-contain" />
        )}
      </SidebarHeader>
      <SidebarContent className="gap-0">
        <NavMain />
      </SidebarContent>
      {/*
        Identity lives in exactly one place per breakpoint: here below `md`,
        and in TopNav's UserMenu from `md` up. Gated with CSS rather than the
        sidebar's `isMobile`, because that hook reports desktop during SSR and
        would flash the wrong surface on a phone.
      */}
      <SidebarFooter className="md:hidden">
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

export function AppSidebar(props) {
  return <AppSidebarContent {...props} />;
}
