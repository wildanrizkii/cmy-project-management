"use client";
import { apiFetch } from "@/lib/fetch-client";

import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, AlertTriangle, AlertCircle, Info, X } from "lucide-react";

type SubFaseAlert = {
  id: string;
  projectId: string;
  name: string;
  picName: string;
  alertLevel: "RED" | "ORANGE" | "YELLOW";
  alertMsg: string;
};

type ProjectAlert = {
  level: "KRITIS" | "PERINGATAN" | "INFO";
  message: string;
  projectCode?: string;
  details?: { code: string; name: string; daysLate: number }[];
};

const SUBFASE_CONFIG = {
  RED: {
    icon: AlertTriangle,
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-100",
    label: "Critical",
    dot: "bg-red-500",
  },
  ORANGE: {
    icon: AlertCircle,
    color: "text-orange-600",
    bg: "bg-orange-50",
    border: "border-orange-100",
    label: "Warning",
    dot: "bg-orange-500",
  },
  YELLOW: {
    icon: Info,
    color: "text-yellow-600",
    bg: "bg-yellow-50",
    border: "border-yellow-100",
    label: "Attention",
    dot: "bg-yellow-500",
  },
};

const LS_KEY = "cmw_dismissed_sf_alerts";

function loadDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch { return new Set(); }
}

function saveDismissed(set: Set<string>) {
  try { localStorage.setItem(LS_KEY, JSON.stringify([...set])); } catch {}
}

function SubFaseAlertRow({ alert, onDismiss }: { alert: SubFaseAlert; onDismiss: () => void }) {
  const cfg = SUBFASE_CONFIG[alert.alertLevel];
  const Icon = cfg.icon;

  return (
    <div className={`border-b border-gray-50 last:border-0 ${cfg.bg}`}>
      <div className="flex items-start gap-2.5 px-4 py-3">
        <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${cfg.color}`} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-800 leading-snug">{alert.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">PIC: {alert.picName}</p>
          <p className={`text-xs font-medium mt-0.5 ${cfg.color}`}>{alert.alertMsg}</p>
        </div>
        <button
          onClick={onDismiss}
          className="p-1 text-gray-300 hover:text-gray-500 rounded shrink-0"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

function ProjectAlertRow({ alert, onDismiss }: { alert: ProjectAlert; onDismiss: () => void }) {
  const Icon = alert.level === "KRITIS" ? AlertTriangle : alert.level === "PERINGATAN" ? AlertCircle : Info;
  const color = alert.level === "KRITIS" ? "text-red-600" : alert.level === "PERINGATAN" ? "text-yellow-600" : "text-blue-500";
  const bg = alert.level === "KRITIS" ? "bg-red-50" : alert.level === "PERINGATAN" ? "bg-yellow-50" : "bg-blue-50";

  return (
    <div className={`border-b border-gray-50 last:border-0 ${bg}`}>
      <div className="flex items-start gap-2.5 px-4 py-3">
        <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${color}`} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-800 leading-snug">{alert.message}</p>
        </div>
        <button onClick={onDismiss} className="p-1 text-gray-300 hover:text-gray-500 rounded shrink-0">
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
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

  const subFaseAlerts: SubFaseAlert[] = [
    ...(data?.subFaseAlerts?.red ?? []),
    ...(data?.subFaseAlerts?.orange ?? []),
    ...(data?.subFaseAlerts?.yellow ?? []),
  ];

  const projectAlerts: ProjectAlert[] = data?.alerts ?? [];

  const visibleSubFase = subFaseAlerts.filter((a) => !dismissed.has(`sf:${a.id}`));
  const visibleProject = projectAlerts.filter((a) => !dismissed.has(`pa:${a.level}:${a.message}`));

  const totalCount = visibleSubFase.length + visibleProject.length;
  const criticalCount = visibleSubFase.filter((a) => a.alertLevel === "RED").length +
    visibleProject.filter((a) => a.level === "KRITIS").length;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const dismissSf = (a: SubFaseAlert) => {
    const next = new Set(dismissed).add(`sf:${a.id}`);
    setDismissed(next);
    saveDismissed(next);
  };

  const dismissPa = (a: ProjectAlert) => {
    const next = new Set(dismissed).add(`pa:${a.level}:${a.message}`);
    setDismissed(next);
    saveDismissed(next);
  };

  const dismissAll = () => {
    const next = new Set([
      ...subFaseAlerts.map((a) => `sf:${a.id}`),
      ...projectAlerts.map((a) => `pa:${a.level}:${a.message}`),
    ]);
    setDismissed(next);
    saveDismissed(next);
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {totalCount > 0 && (
          <span className={`absolute top-1 right-1 w-4 h-4 rounded-full text-white text-[10px] font-bold flex items-center justify-center ${criticalCount > 0 ? "bg-red-500" : "bg-yellow-500"}`}>
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
              <span className="text-sm font-semibold text-gray-900">Notifications</span>
              {totalCount > 0 && (
                <span className="bg-gray-100 text-gray-600 text-xs font-medium px-1.5 py-0.5 rounded-full">
                  {totalCount}
                </span>
              )}
            </div>
            {totalCount > 0 && (
              <button onClick={dismissAll} className="text-xs text-blue-600 hover:underline">
                Dismiss all
              </button>
            )}
          </div>

          {/* Legend */}
          {totalCount > 0 && (
            <div className="flex gap-3 px-4 py-2 bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />Critical</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />Warning</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />Attention</span>
            </div>
          )}

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {totalCount === 0 ? (
              <div className="py-10 text-center">
                <Bell className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No notifications</p>
              </div>
            ) : (
              <>
                {/* SubFase alerts grouped by level */}
                {(["RED", "ORANGE", "YELLOW"] as const).map((level) =>
                  visibleSubFase
                    .filter((a) => a.alertLevel === level)
                    .map((a) => (
                      <SubFaseAlertRow key={a.id} alert={a} onDismiss={() => dismissSf(a)} />
                    ))
                )}
                {/* Project-level alerts */}
                {(["KRITIS", "PERINGATAN", "INFO"] as const).map((level) =>
                  visibleProject
                    .filter((a) => a.level === level)
                    .map((a) => (
                      <ProjectAlertRow
                        key={`${a.level}:${a.message}`}
                        alert={a}
                        onDismiss={() => dismissPa(a)}
                      />
                    ))
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
