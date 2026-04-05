"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FolderKanban,
  Kanban,
  LogOut,
  Building2,
  ChevronLeft,
  ChevronRight,
  Users,
  X,
} from "lucide-react";
import { DEPARTMENT_LABELS } from "@/types";
import type { Department } from "@/types";
import { useSidebar } from "./sidebar-context";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, atasanOnly: false },
  { href: "/proyek", label: "Daftar Proyek", icon: FolderKanban, atasanOnly: false },
  { href: "/kanban", label: "Kanban Board", icon: Kanban, atasanOnly: false },
  { href: "/users", label: "Manajemen User", icon: Users, atasanOnly: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { collapsed, setCollapsed, mobileOpen, setMobileOpen } = useSidebar();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const NavContent = () => (
    <>
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-white/10 relative">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-400 shrink-0" />
            <span className="font-bold text-sm">CMW Project</span>
          </div>
        )}
        {collapsed && <Building2 className="w-6 h-6 text-blue-400 mx-auto" />}
        {/* Desktop collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#1e2635] border border-white/20 rounded-full items-center justify-center hover:bg-blue-600 transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-3 h-3" />
          ) : (
            <ChevronLeft className="w-3 h-3" />
          )}
        </button>
        {/* Mobile close */}
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 space-y-1 px-2 overflow-y-auto">
        {!collapsed && (
          <p className="px-3 mb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Menu
          </p>
        )}
        {navItems
          .filter(({ atasanOnly }) => !atasanOnly || session?.user?.role === "ATASAN")
          .map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                  active
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                    : "text-gray-400 hover:bg-white/10 hover:text-white"
                )}
                title={collapsed ? label : undefined}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {!collapsed && <span>{label}</span>}
              </Link>
            );
          })}
      </nav>

      {/* User section */}
      <div className="border-t border-white/10 p-4">
        {!collapsed ? (
          <div className="space-y-3">
            <button
              onClick={() => { router.push("/profile"); setMobileOpen(false); }}
              className="flex items-center gap-3 w-full hover:bg-white/10 rounded-lg p-1.5 -mx-1.5 transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-linear-to-br from-blue-500 to-blue-700 flex items-center justify-center shrink-0 shadow">
                <span className="text-sm font-bold">
                  {session?.user?.name?.charAt(0).toUpperCase() ?? "U"}
                </span>
              </div>
              <div className="overflow-hidden min-w-0 text-left">
                <p className="text-sm font-semibold truncate">{session?.user?.name}</p>
                <p className="text-xs text-gray-400 truncate">
                  {session?.user?.role === "ATASAN"
                    ? "Atasan (Manager)"
                    : DEPARTMENT_LABELS[(session?.user?.department as Department) ?? "PROJECT_LEADER"]}
                </p>
              </div>
            </button>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Keluar</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="flex items-center justify-center w-full p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Keluar"
          >
            <LogOut className="w-5 h-5" />
          </button>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden md:flex flex-col bg-[#1e2635] text-white transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <NavContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden bg-black/50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 md:hidden flex flex-col bg-[#1e2635] text-white w-64 transition-transform duration-300",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <NavContent />
      </aside>

      {/* Logout confirmation modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowLogoutConfirm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <LogOut className="w-5 h-5 text-red-600" />
              </div>
              <button onClick={() => setShowLogoutConfirm(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">Keluar dari aplikasi?</h3>
            <p className="text-sm text-gray-500 mb-5">Anda akan dikembalikan ke halaman login.</p>
            <div className="flex gap-3">
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Ya, Keluar
              </button>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-lg text-sm font-medium transition-colors"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
