import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import DashboardTopNav from "@/components/dashboard/nav/DashboardTopNav";
import IdleLogoutWatcher from "@/components/common/IdleLogoutWatcher";

/**
 * Access is gated before this ever renders — `src/proxy.js` redirects requests
 * with no session cookie, so there is no client-side guard here and no splash
 * on every navigation.
 *
 * A cookie that exists but is no longer valid is caught by the axios layer:
 * any 401 that survives a refresh attempt triggers `handleSessionExpiry`.
 *
 * `IdleLogoutWatcher` sits here, once, rather than on each screen: the session
 * is one thing, and a timer mounted per page would reset on every navigation —
 * the one event that is not evidence anybody is there.
 */
export default function DashboardLayout({ children }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex min-h-screen w-full flex-col bg-background min-w-0">
        <IdleLogoutWatcher />
        <DashboardTopNav />
        <div className="flex-1 w-full flex flex-col min-w-0">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
