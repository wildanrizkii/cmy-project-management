"use client";

import { useSidebar } from "./sidebar-context";
import { NotificationBell } from "./notification-bell";
import { ErrorBoundary } from "./error-boundary";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, Search, X } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/fetch-client";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/proyek": "Daftar Proyek",
  "/kanban": "Kanban Board",
  "/users": "Manajemen User",
  "/profile": "Profil Saya",
};

type SearchProject = { id: string; assNumber: string; assName: string };

function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const { data: results = [] } = useQuery<SearchProject[]>({
    queryKey: ["global-search", debouncedQuery],
    queryFn: () =>
      debouncedQuery.length >= 1
        ? apiFetch(`/api/projects?search=${encodeURIComponent(debouncedQuery)}`).then((r) => r.json())
        : Promise.resolve([]),
    enabled: debouncedQuery.length >= 1,
  });

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = useCallback((project: SearchProject) => {
    sessionStorage.setItem("openProjectId", project.id);
    setOpen(false);
    setQuery("");
    router.push("/proyek");
  }, [router]);

  const showDropdown = open && debouncedQuery.length >= 1;

  return (
    <div ref={containerRef} className="relative hidden sm:block">
      <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 w-56 md:w-72">
        <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search projects..."
          className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none"
        />
        {query && (
          <button onClick={() => { setQuery(""); setDebouncedQuery(""); }} className="text-gray-400 hover:text-gray-600">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute top-full left-0 mt-1 w-full min-w-72 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-64 overflow-y-auto">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-400">No projects found</p>
          ) : (
            results.map((p) => (
              <button
                key={p.id}
                onClick={() => handleSelect(p)}
                className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center gap-3 border-b border-gray-50 last:border-0"
              >
                <span className="font-mono text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded shrink-0">{p.assNumber}</span>
                <span className="text-sm text-gray-800 truncate">{p.assName}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

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
        <div className="flex items-center gap-3">
          <GlobalSearch />
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
