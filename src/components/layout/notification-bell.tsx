"use client";
import { apiFetch } from "@/lib/fetch-client";

import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, AlertTriangle, AlertCircle, Info, ChevronDown, ChevronUp, X } from "lucide-react";

type AlertItem = {
  level: "KRITIS" | "PERINGATAN" | "INFO";
  message: string;
  projectCode?: string;
  details?: { code: string; name: string; daysLate: number }[];
};

const LEVEL_CONFIG = {
  KRITIS: {
    icon: AlertTriangle,
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-100",
    badge: "bg-red-500",
    label: "Kritis",
  },
  PERINGATAN: {
    icon: AlertCircle,
    color: "text-yellow-600",
    bg: "bg-yellow-50",
    border: "border-yellow-100",
    badge: "bg-yellow-500",
    label: "Peringatan",
  },
  INFO: {
    icon: Info,
    color: "text-blue-500",
    bg: "bg-blue-50",
    border: "border-blue-100",
    badge: "bg-blue-500",
    label: "Info",
  },
};

function AlertRow({ alert, onDismiss }: { alert: AlertItem; onDismiss: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = LEVEL_CONFIG[alert.level];
  const Icon = cfg.icon;

  return (
    <div className={`border-b border-gray-50 last:border-0 ${cfg.bg}`}>
      <div className="flex items-start gap-2.5 px-4 py-3">
        <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${cfg.color}`} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-800 leading-snug">{alert.message}</p>
          {alert.details && expanded && (
            <ul className="mt-2 space-y-1">
              {alert.details.map((d) => (
                <li key={d.code} className="flex items-center gap-2 text-xs text-gray-600">
                  <span className="font-mono font-semibold text-gray-700 shrink-0">{d.code}</span>
                  <span className="truncate">{d.name}</span>
                  <span className={`shrink-0 font-semibold ${cfg.color}`}>{d.daysLate}h</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {alert.details && alert.details.length > 0 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
            >
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
          <button
            onClick={onDismiss}
            className="p-1 text-gray-300 hover:text-gray-500 rounded"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

const LS_KEY = "cmw_dismissed_alerts";

function loadDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch { return new Set(); }
}

function saveDismissed(set: Set<string>) {
  try { localStorage.setItem(LS_KEY, JSON.stringify([...set])); } catch {}
}

function alertKey(a: AlertItem) {
  return `${a.level}:${a.message}`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(() =>
    typeof window !== "undefined" ? loadDismissed() : new Set()
  );
  const panelRef = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => apiFetch("/api/dashboard").then((r) => r.json()),
    refetchInterval: 30000,
  });

  const allAlerts: AlertItem[] = data?.alerts ?? [];
  const visible = allAlerts.filter((a) => !dismissed.has(alertKey(a)));
  const kritisCount = visible.filter((a) => a.level === "KRITIS").length;
  const totalCount = visible.length;

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const dismiss = (a: AlertItem) => {
    const next = new Set(dismissed).add(alertKey(a));
    setDismissed(next);
    saveDismissed(next);
  };
  const dismissAll = () => {
    const next = new Set(allAlerts.map(alertKey));
    setDismissed(next);
    saveDismissed(next);
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
        title="Notifikasi"
      >
        <Bell className="w-5 h-5" />
        {totalCount > 0 && (
          <span className={`absolute top-1 right-1 w-4 h-4 rounded-full text-white text-[10px] font-bold flex items-center justify-center ${kritisCount > 0 ? "bg-red-500" : "bg-yellow-500"}`}>
            {totalCount > 9 ? "9+" : totalCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-semibold text-gray-900">Notifikasi</span>
              {totalCount > 0 && (
                <span className="bg-gray-100 text-gray-600 text-xs font-medium px-1.5 py-0.5 rounded-full">
                  {totalCount}
                </span>
              )}
            </div>
            {totalCount > 0 && (
              <button
                onClick={dismissAll}
                className="text-xs text-blue-600 hover:underline"
              >
                Tutup semua
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {totalCount === 0 ? (
              <div className="py-10 text-center">
                <Bell className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Tidak ada notifikasi</p>
              </div>
            ) : (
              (["KRITIS", "PERINGATAN", "INFO"] as const).map((level) =>
                allAlerts
                  .filter((a) => a.level === level && !dismissed.has(alertKey(a)))
                  .map((a) => (
                    <AlertRow key={alertKey(a)} alert={a} onDismiss={() => dismiss(a)} />
                  ))
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
