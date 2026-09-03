import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./components/app-sidebar";
import { NotificationsProvider } from "./components/NotificationsProvider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <NotificationsProvider />
      <AppSidebar />
      <main className="w-screen">
        <SidebarTrigger />
        <div className="max-w-6xl mx-auto p-4">{children}</div>
      </main>
    </SidebarProvider>
  );
}
