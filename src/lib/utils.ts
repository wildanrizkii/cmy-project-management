import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Priority, ProjectStatus, Fase, HinanhyoDRStatus } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "-";
  return new Date(date).toLocaleString("id-ID", {
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

export function getFaseColor(fase: Fase | string): string {
  const map: Record<string, string> = {
    RFQ: "bg-purple-100 text-purple-700",
    DIE_GO: "bg-blue-100 text-blue-700",
    EVENT_PROJECT: "bg-cyan-100 text-cyan-700",
    MASS_PRO: "bg-green-100 text-green-700",
  };
  return map[fase] ?? "bg-gray-100 text-gray-700";
}

export function getHinanhyoStatusColor(status: HinanhyoDRStatus | string): string {
  const map: Record<string, string> = {
    DITERIMA: "bg-green-100 text-green-700",
    DITOLAK: "bg-red-100 text-red-700",
    PENDING: "bg-yellow-100 text-yellow-700",
  };
  return map[status] ?? "bg-gray-100 text-gray-700";
}

export function calculateOverallProgress(
  rfq: number,
  dieGo: number,
  eventProject: number,
  massPro: number
): number {
  return Math.round((rfq + dieGo + eventProject + massPro) / 4);
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

export function cycleTimeEfficiency(target: number, actual: number | null): string {
  if (!actual) return "-";
  const eff = (target / actual) * 100;
  return eff.toFixed(1) + "%";
}
