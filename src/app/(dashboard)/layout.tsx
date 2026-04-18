import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { SidebarProvider } from "@/components/layout/sidebar-context";
import { MainContent } from "@/components/layout/main-content";
import { ToastProvider } from "@/components/layout/toast-context";
import { LanguageProvider } from "@/contexts/language-context";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <LanguageProvider>
      <SidebarProvider>
        <ToastProvider>
          <div className="min-h-screen bg-gray-50 flex">
            <Sidebar />
            <MainContent>{children}</MainContent>
          </div>
        </ToastProvider>
      </SidebarProvider>
    </LanguageProvider>
  );
}
