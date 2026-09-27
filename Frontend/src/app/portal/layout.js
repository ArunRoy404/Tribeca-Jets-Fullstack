import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import IdleLogoutWatcher from "@/components/common/IdleLogoutWatcher";
import AreaGate from "@/components/common/AreaGate";
import PortalTopNav from "@/components/portal/PortalTopNav";
import { PORTAL_HOME, PORTAL_SECTIONS } from "@/components/portal/portalNav";

/**
 * The referral partner portal (client adjustment #11): the same shell as the
 * CRM — sidebar, sticky header, idle sign-out — showing only the portal's five
 * entries.
 *
 * `src/proxy.js` turns away a visitor with no session before this renders;
 * `AreaGate` sends staff back to the CRM once the session says who they are.
 * Neither is the security boundary — every endpoint these pages call scopes
 * an agent to their own referrals and commissions on the server.
 */
export default function PortalLayout({ children }) {
  return (
    <AreaGate area="partner">
      <SidebarProvider>
        <AppSidebar home={PORTAL_HOME} sections={PORTAL_SECTIONS} />
        <SidebarInset className="flex min-h-screen w-full flex-col bg-background min-w-0">
          <IdleLogoutWatcher />
          <PortalTopNav />
          <div className="flex-1 w-full flex flex-col min-w-0">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </AreaGate>
  );
}
