"use client";

import { useSidebar } from "./sidebar-context";
import { NotificationBell } from "./notification-bell";
import { ErrorBoundary } from "./error-boundary";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import { useState, useEffect } from "react";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/proyek": "Daftar Proyek",
  "/kanban": "Kanban Board",
  "/users": "Manajemen User",
  "/profile": "Profil Saya",
};

export function MainContent({ children }: { children: React.ReactNode }) {
  const { collapsed, setMobileOpen } = useSidebar();
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const title = PAGE_TITLES[pathname] ?? "CMW Project";

  // Track if we're on desktop to apply sidebar offset
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const sidebarOffset = isDesktop ? (collapsed ? "4rem" : "16rem") : "0";

  return (
    <main
      className="flex-1 min-h-screen flex flex-col transition-all duration-300"
      style={{ paddingLeft: sidebarOffset }}
    >
      {/* Top bar */}
      <div className="sticky top-0 z-30 h-14 bg-white border-b border-gray-100 flex items-center justify-between px-4 md:px-6 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Buka menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button
            onClick={() => router.push("/profile")}
            className="flex items-center gap-2 hover:bg-gray-50 rounded-lg px-2 py-1 transition-colors"
            title="Profil Saya"
          >
            <div className="w-7 h-7 rounded-full bg-linear-to-br from-blue-500 to-blue-700 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-white">
                {session?.user?.name?.charAt(0).toUpperCase() ?? "U"}
              </span>
            </div>
            <span className="text-sm font-medium text-gray-700 max-w-32 truncate hidden sm:block">
              {session?.user?.name}
            </span>
          </button>
        </div>
      </div>

      <div className="flex-1">
        <ErrorBoundary>{children}</ErrorBoundary>
      </div>
    </main>
  );
}
