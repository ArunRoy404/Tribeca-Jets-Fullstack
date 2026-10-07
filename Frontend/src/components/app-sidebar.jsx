"use client";

import BrandLogo from "@/components/common/BrandLogo";
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

function AppSidebarContent({ home, sections, ...props }) {
  const { state, isMobile } = useSidebar();
  const isCollapsed = state === "collapsed" && !isMobile;

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="h-[57px] sm:h-[65px] shrink-0 items-center justify-center border-b border-sidebar-border px-3 sm:px-6 py-0">
        {isCollapsed ? (
          <BrandLogo compact width={24} height={24} className="h-6 w-auto object-contain" />
        ) : (
          <BrandLogo tone="light" width={80} height={48} className="h-7 sm:h-9 w-auto object-contain" />
        )}
      </SidebarHeader>
      <SidebarContent className="gap-0">
        <NavMain home={home} sections={sections} />
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

/**
 * `home` and `sections` are optional and default to the CRM's menu — the
 * partner portal (#11) passes its own. See `NavMain`.
 */
export function AppSidebar(props) {
  return <AppSidebarContent {...props} />;
}
