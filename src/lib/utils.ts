import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Priority, ProjectStatus, FaseType, HinanhyoDRStatus } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "-";
  return new Date(date).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getPriorityColor(priority: Priority | string): string {
  const map: Record<string, string> = {
    HIGH: "bg-red-100 text-red-700 border-red-200",
    MEDIUM: "bg-yellow-100 text-yellow-700 border-yellow-200",
    LOW: "bg-green-100 text-green-700 border-green-200",
  };
  return map[priority] ?? "bg-gray-100 text-gray-700 border-gray-200";
}

export function getPriorityDot(priority: Priority | string): string {
  const map: Record<string, string> = {
    HIGH: "bg-red-500",
    MEDIUM: "bg-yellow-500",
    LOW: "bg-green-500",
  };
  return map[priority] ?? "bg-gray-400";
}

export function getStatusColor(status: ProjectStatus | string): string {
  const map: Record<string, string> = {
    BELUM_MULAI: "bg-gray-100 text-gray-700 border-gray-200",
    DALAM_PROSES: "bg-blue-100 text-blue-700 border-blue-200",
    SELESAI: "bg-green-100 text-green-700 border-green-200",
    TERLAMBAT: "bg-red-100 text-red-700 border-red-200",
    TUNDA: "bg-orange-100 text-orange-700 border-orange-200",
  };
  return map[status] ?? "bg-gray-100 text-gray-700 border-gray-200";
}

// Phase colors: RFQ=Blue, Die Go=Green, Event Project=Light green, Mass Pro=Yellow
export function getFaseColor(fase: FaseType | string): string {
  const map: Record<string, string> = {
    RFQ: "bg-blue-100 text-blue-700",
    DIE_GO: "bg-green-100 text-green-700",
    EVENT_PROJECT: "bg-emerald-100 text-emerald-600",
    MASS_PRO: "bg-yellow-100 text-yellow-700",
  };
  return map[fase] ?? "bg-gray-100 text-gray-700";
}

export function getFaseChartColor(fase: FaseType | string): string {
  const map: Record<string, string> = {
    RFQ: "#3b82f6",        // blue-500
    DIE_GO: "#22c55e",     // green-500
    EVENT_PROJECT: "#10b981", // emerald-500
    MASS_PRO: "#eab308",   // yellow-500
  };
  return map[fase] ?? "#6b7280";
}

export function getHinanhyoStatusColor(status: HinanhyoDRStatus | string): string {
  const map: Record<string, string> = {
    DITERIMA: "bg-green-100 text-green-700",
    DITOLAK: "bg-red-100 text-red-700",
    PENDING: "bg-yellow-100 text-yellow-700",
  };
  return map[status] ?? "bg-gray-100 text-gray-700";
}

const FASE_ORDER = ["RFQ", "DIE_GO", "EVENT_PROJECT", "MASS_PRO"] as const;
const FASE_WEIGHT = 100 / FASE_ORDER.length; // 25% each

export function computeProjectProgress(fases: { fase: string; subFases: { isDone: boolean }[] }[]): number {
  let total = 0;
  for (const faseKey of FASE_ORDER) {
    const f = fases.find((x) => x.fase === faseKey);
    if (!f || f.subFases.length === 0) continue;
    const phaseDone = f.subFases.filter((s) => s.isDone).length;
    total += (phaseDone / f.subFases.length) * FASE_WEIGHT;
  }
  return Math.round(total);
}

export function computeFaseProgress(subFases: { isDone: boolean }[]): number {
  if (!subFases.length) return 0;
  return Math.round((subFases.filter((s) => s.isDone).length / subFases.length) * 100);
}

export function getDaysRemaining(endDate: string): number {
  const end = new Date(endDate);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function getDaysLate(endDate: string): number {
  return -getDaysRemaining(endDate);
}

export function isOverdue(endDate: string, status: ProjectStatus): boolean {
  return getDaysRemaining(endDate) < 0 && status !== "SELESAI";
}
