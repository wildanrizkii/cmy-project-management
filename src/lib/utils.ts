import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

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

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    TODO: "bg-slate-100 text-slate-700",
    IN_PROGRESS: "bg-blue-100 text-blue-700",
    DONE: "bg-green-100 text-green-700",
    ACTIVE: "bg-emerald-100 text-emerald-700",
    COMPLETED: "bg-green-100 text-green-700",
    ARCHIVED: "bg-gray-100 text-gray-700",
    ON_HOLD: "bg-yellow-100 text-yellow-700",
  };
  return map[status] ?? "bg-gray-100 text-gray-700";
}

export function getPriorityColor(priority: string): string {
  const map: Record<string, string> = {
    LOW: "bg-slate-100 text-slate-600",
    MEDIUM: "bg-yellow-100 text-yellow-700",
    HIGH: "bg-orange-100 text-orange-700",
    URGENT: "bg-red-100 text-red-700",
  };
  return map[priority] ?? "bg-gray-100 text-gray-700";
}
