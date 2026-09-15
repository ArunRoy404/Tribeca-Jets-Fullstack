import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import DashboardTopNav from "@/components/dashboard/nav/DashboardTopNav";

export default function DashboardLayout({ children }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex min-h-screen w-full flex-col bg-background">
        <DashboardTopNav />
        <div className="flex-1 w-full flex flex-col">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
