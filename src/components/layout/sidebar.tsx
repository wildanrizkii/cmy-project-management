"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard, FolderKanban, ListTodo, BarChart3,
  ChevronRight, Plus, FolderOpen, X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store";
import { Project } from "@/types";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/dashboard/projects", icon: FolderKanban, label: "Proyek" },
  { href: "/dashboard/tasks", icon: ListTodo, label: "Semua Tugas" },
  { href: "/dashboard/reports", icon: BarChart3, label: "Laporan" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { sidebarOpen, setSidebarOpen, setCreateProjectOpen } = useAppStore();

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: () => fetch("/api/projects").then((r) => r.json()),
    enabled: !!session,
  });

  if (!sidebarOpen) return null;

  return (
    <>
      {/* Mobile overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        onClick={() => setSidebarOpen(false)}
      />

      <aside className="fixed left-0 top-0 bottom-0 w-[260px] bg-white border-r border-border z-50 flex flex-col">
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="p-1.5 bg-primary rounded-md">
              <FolderKanban className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg">CMY</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                pathname === item.href
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          ))}

          {/* Projects section */}
          <div className="pt-4">
            <div className="flex items-center justify-between px-3 py-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Proyek Saya
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setCreateProjectOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="mt-1 space-y-1">
              {projects?.slice(0, 8).map((project) => (
                <Link
                  key={project.id}
                  href={`/dashboard/projects/${project.id}`}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors group",
                    pathname.startsWith(`/dashboard/projects/${project.id}`)
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <FolderOpen className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{project.name}</span>
                  <ChevronRight className="h-3 w-3 ml-auto shrink-0 opacity-0 group-hover:opacity-100" />
                </Link>
              ))}
            </div>
          </div>
        </nav>

        {/* User info */}
        <div className="p-3 border-t">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
              {session?.user?.name?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{session?.user?.name ?? "User"}</p>
              <p className="text-xs text-muted-foreground truncate">{session?.user?.email}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
