"use client";
import { apiFetch } from "@/lib/fetch-client";

import React, { useState, useEffect, useRef, memo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X, Plus, Save, Loader2, Download, Check, Trash2, ChevronDown, ChevronRight, Edit2, ExternalLink, CheckCircle2, Info, Layers, AlertTriangle, Users, Timer, CalendarDays, FileText, Activity } from "lucide-react";
import * as XLSX from "xlsx";
import { useToast } from "@/components/layout/toast-context";
import { useLanguage } from "@/contexts/language-context";
import {
  formatDate,
  formatDateTime,
  getStatusColor,
  getFaseColor,
  getHinanhyoStatusColor,
  computeProjectProgress,
  computeFaseProgress,
} from "@/lib/utils";
import {
  STATUS_LABELS,
  FASE_LABELS,
  PRIORITY_LABELS,
  HINANHYO_STATUS_LABELS,
  HINANHYO_TYPE_LABELS,
  DEPARTMENT_LABELS,
  FASE_ORDER,
} from "@/types";
import type { Project, HinanhyoDR, HinanhyoDRType, HinanhyoDRStatus, ActivityLog, User, ProjectFase, SubFase, FaseType, Customer } from "@/types";

interface Props {
  project: Project;
  onClose: () => void;
  onUpdate: (p: Project) => void;
  initialTab?: Tab;
}

type Tab = "info" | "phases" | "hinanhyo" | "mp" | "ct" | "schedule" | "meeting" | "activity";

const CUSTOMER_OPTIONS: { value: Customer; label: string }[] = [
  { value: "AHM", label: "AHM" },
  { value: "ICHIKOH", label: "ICHIKOH" },
  { value: "TMMIN", label: "TMMIN" },
  { value: "ITEC", label: "ITEC" },
  { value: "MITSUBA", label: "MITSUBA" },
  { value: "KOITO", label: "KOITO" },
  { value: "HPM", label: "HPM" },
  { value: "AJI", label: "AJI" },
];

export function ProjectDetailModal({ project, onClose, onUpdate, initialTab }: Props) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>(initialTab ?? "info");
  const [mountedTabs, setMountedTabs] = useState<Set<Tab>>(new Set([initialTab ?? "info"]));
  const changeTab = (t: Tab) => { setTab(t); setMountedTabs((prev) => new Set([...prev, t])); };
  const tabScrollRef = useRef<HTMLDivElement>(null);
  const scrollTabs = (dir: "left" | "right") => {
    if (tabScrollRef.current) tabScrollRef.current.scrollBy({ left: dir === "left" ? -120 : 120, behavior: "smooth" });
  };

  // Fetch full project detail
  const { data: detail, refetch } = useQuery<Project>({
    queryKey: ["project", project.id],
    queryFn: () => apiFetch(`/api/projects/${project.id}`).then((r) => r.json()),
    initialData: project,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: () => apiFetch("/api/users").then((r) => r.json()),
    staleTime: 120000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
  });

  const handleExport = async () => {
    const [detailRes, hinanhyoRes, activityRes] = await Promise.all([
      apiFetch(`/api/projects/${project.id}`).then((r) => r.json()),
      apiFetch(`/api/projects/${project.id}/hinanhyo`).then((r) => r.json()),
      apiFetch(`/api/projects/${project.id}/activity`).then((r) => r.json()),
    ]);
    const d = detailRes as Project;
    const wb = XLSX.utils.book_new();

    const info = [
      ["Assy Number", d.assNumber],
      ["Assy Name", d.assName],
      ["Model", d.model],
      ["Customer", d.customer],
      ["Project Leader", d.projectLeader?.name ?? "-"],
      ["Priority", PRIORITY_LABELS[d.priority]],
      ["Status", STATUS_LABELS[d.status]],
      ["Current Phase", FASE_LABELS[d.currentFase]],
      ["Start Date", formatDate(d.startDate)],
      ["Target Date", formatDate(d.targetDate)],
      ["Description", d.description ?? "-"],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(info), "General Info");

    if (hinanhyoRes.length > 0) {
      const rows = (hinanhyoRes as HinanhyoDR[]).map((h) => ({
        Type: HINANHYO_TYPE_LABELS[h.type],
        Title: h.title,
        Description: h.description ?? "-",
        "SubPhase": h.subFase?.name ?? "-",
        Status: HINANHYO_STATUS_LABELS[h.status],
        Created: formatDate(h.createdAt),
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Hinanhyo & DR");
    }

    if (activityRes.length > 0) {
      const rows = (activityRes as ActivityLog[]).map((a) => ({
        Date: formatDateTime(a.createdAt),
        User: (a as ActivityLog & { user?: { name: string } }).user?.name ?? "-",
        Action: a.action,
        Detail: a.detail ?? "-",
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Activity Log");
    }

    XLSX.writeFile(wb, `${d.assNumber}-${d.assName.replace(/\s+/g, "-")}.xlsx`);
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "info", label: t.modal.tabs.info, icon: <Info className="w-3.5 h-3.5" /> },
    { id: "phases", label: t.modal.tabs.phases, icon: <Layers className="w-3.5 h-3.5" /> },
    { id: "hinanhyo", label: t.modal.tabs.hinanhyo, icon: <AlertTriangle className="w-3.5 h-3.5" /> },
    { id: "mp", label: t.modal.tabs.mp, icon: <Users className="w-3.5 h-3.5" /> },
    { id: "ct", label: t.modal.tabs.ct, icon: <Timer className="w-3.5 h-3.5" /> },
    { id: "schedule", label: t.modal.tabs.schedule, icon: <CalendarDays className="w-3.5 h-3.5" /> },
    { id: "meeting", label: t.modal.tabs.meeting, icon: <FileText className="w-3.5 h-3.5" /> },
    { id: "activity", label: t.modal.tabs.activity, icon: <Activity className="w-3.5 h-3.5" /> },
  ];

  const overallProgress = computeProjectProgress(detail.fases ?? []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded font-medium">{detail.assNumber}</span>
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(detail.status)}`}>
                {STATUS_LABELS[detail.status]}
              </span>
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getFaseColor(detail.currentFase)}`}>
                {FASE_LABELS[detail.currentFase]}
              </span>
            </div>
            <h2 className="text-lg font-bold text-gray-900 mt-1.5 truncate">{detail.assName}</h2>
            <p className="text-sm text-gray-500">{detail.model} - {detail.customer}</p>
          </div>
          <div className="flex items-center gap-2 ml-4 shrink-0">
            <button
              onClick={handleExport}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
              title="Export Excel"
            >
              <Download className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-6 py-3 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 font-medium w-24">Overall Progress</span>
            <div className="flex-1 h-2 bg-gray-200 rounded-full">
              <div className="h-2 bg-blue-500 rounded-full transition-all" style={{ width: `${overallProgress}%` }} />
            </div>
            <span className="text-xs font-bold text-gray-700 w-10 text-right">{overallProgress}%</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="relative flex items-end border-b border-gray-100 bg-gray-50/60">
          <button
            onClick={() => scrollTabs("left")}
            className="shrink-0 px-1.5 pb-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ChevronDown className="w-3.5 h-3.5 rotate-90" />
          </button>
          <div
            ref={tabScrollRef}
            className="flex gap-1 pt-2 overflow-x-auto flex-1"
            style={{ scrollbarWidth: "none" }}
          >
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => changeTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap rounded-t-lg transition-all border-b-2 ${tab === t.id
                  ? "border-blue-600 text-blue-600 bg-white shadow-sm"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-white/70"
                  }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => scrollTabs("right")}
            className="shrink-0 px-1.5 pb-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
          </button>
        </div>

        {/* Content - tabs are lazy-mounted: only rendered on first visit, then kept alive with hidden */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className={tab !== "info" ? "hidden" : ""}>{mountedTabs.has("info") && <InfoTab detail={detail} users={users} onUpdate={onUpdate} toast={toast} refetch={refetch} />}</div>
          <div className={tab !== "phases" ? "hidden" : ""}>{mountedTabs.has("phases") && <PhasesTab detail={detail} users={users} toast={toast} refetch={refetch} queryClient={queryClient} onUpdate={onUpdate} />}</div>
          <div className={tab !== "hinanhyo" ? "hidden" : ""}>{mountedTabs.has("hinanhyo") && <HinanhyoTab detail={detail} toast={toast} refetch={refetch} />}</div>
          <div className={tab !== "mp" ? "hidden" : ""}>{mountedTabs.has("mp") && <ManpowerTab detail={detail} onUpdate={onUpdate} toast={toast} refetch={refetch} />}</div>
          <div className={tab !== "ct" ? "hidden" : ""}>{mountedTabs.has("ct") && <CycleTimeTab detail={detail} onUpdate={onUpdate} toast={toast} refetch={refetch} />}</div>
          <div className={tab !== "schedule" ? "hidden" : ""}>{mountedTabs.has("schedule") && <ScheduleTab detail={detail} toast={toast} />}</div>
          <div className={tab !== "meeting" ? "hidden" : ""}>{mountedTabs.has("meeting") && <MinutesMeetingTab detail={detail} toast={toast} />}</div>
          <div className={tab !== "activity" ? "hidden" : ""}>{mountedTabs.has("activity") && <ActivityTab detail={detail} />}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Info Tab ────────────────────────────────────────────────────────────────

function InfoTab({ detail, users, onUpdate, toast, refetch }: {
  detail: Project;
  users: User[];
  onUpdate: (p: Project) => void;
  toast: (type: "success" | "error", msg: string) => void;
  refetch: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    model: detail.model,
    assNumber: detail.assNumber,
    assName: detail.assName,
    customer: detail.customer,
    description: detail.description ?? "",
    projectLeaderId: detail.projectLeaderId,
    priority: detail.priority,
    status: detail.status,
    currentFase: detail.currentFase,
    startDate: detail.startDate?.slice(0, 10) ?? "",
    targetDate: detail.targetDate?.slice(0, 10) ?? "",
  });
  const [showTundaConfirm, setShowTundaConfirm] = useState(false);

  const save = async () => {
    setSaving(true);
    const res = await apiFetch(`/api/projects/${detail.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { toast("error", data.error ?? "Update failed"); return; }
    toast("success", "Project updated");
    onUpdate(data);
    setEditing(false);
    refetch();
  };

  const setStatus = async (status: string) => {
    const res = await apiFetch(`/api/projects/${detail.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok) { toast("error", data.error ?? "Update failed"); return; }
    toast("success", `Status changed to ${STATUS_LABELS[status as keyof typeof STATUS_LABELS]}`);
    onUpdate(data);
    refetch();
  };

  if (!editing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Project Information</h3>
          <div className="flex gap-2">
            {detail.status === "TUNDA" ? (
              <button
                onClick={() => setStatus("DALAM_PROSES")}
                className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                Reactivate
              </button>
            ) : detail.status !== "SELESAI" && (
              <button
                onClick={() => setShowTundaConfirm(true)}
                className="px-3 py-1.5 text-xs font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors"
              >
                Put On Hold
              </button>
            )}
            <button
              onClick={() => setEditing(true)}
              className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              Edit
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {[
            ["Model", detail.model],
            ["Assy Number", detail.assNumber],
            ["Assy Name", detail.assName],
            ["Customer", detail.customer],
            ["Project Leader", detail.projectLeader?.name ?? "-"],
            ["Priority", PRIORITY_LABELS[detail.priority]],
            ["Status", STATUS_LABELS[detail.status]],
            ["Current Phase", FASE_LABELS[detail.currentFase]],
            ["Start Date", formatDate(detail.startDate)],
            ["Target Date", formatDate(detail.targetDate)],
          ].map(([label, value]) => (
            <div key={label} className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
              <p className="text-sm font-medium text-gray-900">{value}</p>
            </div>
          ))}
          {detail.description && (
            <div className="col-span-2 bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-500 mb-1">Description</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{detail.description}</p>
            </div>
          )}
        </div>

        {showTundaConfirm && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowTundaConfirm(false)} />
            <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-sm w-full">
              <h4 className="font-bold text-gray-900 mb-2">Put project on hold?</h4>
              <p className="text-sm text-gray-500 mb-4">This project will be marked as On Hold and can be reactivated later.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowTundaConfirm(false); setStatus("TUNDA"); }}
                  className="flex-1 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium"
                >
                  Confirm
                </button>
                <button onClick={() => setShowTundaConfirm(false)} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm">Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-800">Edit Project</h3>
        <div className="flex gap-2">
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save
          </button>
          <button onClick={() => setEditing(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">Cancel</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Model</label>
          <input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Assy Number</label>
          <input value={form.assNumber} onChange={(e) => setForm({ ...form, assNumber: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Assy Name</label>
          <input value={form.assName} onChange={(e) => setForm({ ...form, assName: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Customer</label>
          <select
            value={form.customer}
            onChange={(e) => setForm({ ...form, customer: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Customer...</option>
            {CUSTOMER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Project Leader</label>
          <select value={form.projectLeaderId} onChange={(e) => setForm({ ...form, projectLeaderId: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name} - {DEPARTMENT_LABELS[u.department!] ?? u.role}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Priority</label>
          <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Project["priority"] })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Project["status"] })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Current Phase</label>
          <select value={form.currentFase} onChange={(e) => setForm({ ...form, currentFase: e.target.value as FaseType })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {Object.entries(FASE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Start Date</label>
          <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Target Date</label>
          <input type="date" value={form.targetDate} onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-20" />
        </div>
      </div>
    </div>
  );
}

// ─── Phases Tab ───────────────────────────────────────────────────────────────

function PhasesTab({ detail, users, toast, refetch, queryClient, onUpdate }: {
  detail: Project;
  users: User[];
  toast: (type: "success" | "error", msg: string) => void;
  refetch: () => void;
  queryClient: ReturnType<typeof useQueryClient>;
  onUpdate: (p: Project) => void;
}) {
  const fases = detail.fases ?? [];
  const orderedFases = FASE_ORDER.map((f) => fases.find((pf) => pf.fase === f)).filter(Boolean) as ProjectFase[];

  const overallProgress = computeProjectProgress(fases);
  const allDone = overallProgress === 100 && detail.status !== "SELESAI";

  const markComplete = async () => {
    const res = await apiFetch(`/api/projects/${detail.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "SELESAI" }),
    });
    const data = await res.json();
    if (!res.ok) { toast("error", data.error ?? "Update failed"); return; }
    toast("success", "Project marked as Completed!");
    onUpdate(data);
    refetch();
  };

  return (
    <div className="space-y-4">
      {allDone && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-800">All SubPhases completed!</p>
              <p className="text-xs text-green-600">Would you like to mark this project as Completed?</p>
            </div>
          </div>
          <button onClick={markComplete} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium">
            Mark Complete
          </button>
        </div>
      )}
      {orderedFases.map((fase) => (
        <FaseSection key={fase.id} fase={fase} users={users} projectId={detail.id} toast={toast} refetch={refetch} />
      ))}
    </div>
  );
}

function FaseSection({ fase, users, projectId, toast, refetch }: {
  fase: ProjectFase;
  users: User[];
  projectId: string;
  toast: (type: "success" | "error", msg: string) => void;
  refetch: () => void;
}) {
  const [expanded, setExpanded] = useState(fase.fase === "RFQ" || fase.fase === "DIE_GO");
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", description: "", picId: "", picStartDate: "", picTargetDate: "", customerStartDate: "", customerTargetDate: "", documentUrl: "" });
  const [saving, setSaving] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const downloadTemplate = () => {
    const headers = [["Name", "PIC Email", "PIC Start Date", "PIC Target Date", "Customer Start Date", "Customer Target Date", "Document URL", "Description"]];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "SubPhases");
    XLSX.writeFile(wb, `subfase-template-${fase.fase}.xlsx`);
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target?.result;
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "" });

        const parseDate = (val: string): string => {
          if (!val) return "";
          const parts = val.split("/");
          if (parts.length === 3) {
            const [d, m, y] = parts;
            return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
          }
          return val;
        };

        let importedCount = 0;
        for (const row of rows) {
          const name = row["Name"]?.trim();
          if (!name) continue;
          const email = row["PIC Email"]?.trim();
          const user = users.find((u) => u.email === email);
          if (!user) continue;

          await apiFetch(`/api/projects/${projectId}/fases/${fase.id}/subfases`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name,
              picId: user.id,
              picStartDate: parseDate(row["PIC Start Date"]) || null,
              picTargetDate: parseDate(row["PIC Target Date"]) || null,
              customerStartDate: parseDate(row["Customer Start Date"]) || null,
              customerTargetDate: parseDate(row["Customer Target Date"]) || null,
              documentUrl: row["Document URL"] || null,
              description: row["Description"] || null,
            }),
          });
          importedCount++;
        }

        if (importedCount > 0) {
          toast("success", `Imported ${importedCount} SubPhase(s)`);
          refetch();
        } else {
          toast("error", "No valid rows found. Check email addresses match users.");
        }
      } catch {
        toast("error", "Failed to parse Excel file");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const progress = computeFaseProgress(fase.subFases ?? []);

  const FASE_COLORS: Record<string, string> = {
    RFQ: "border-blue-200 bg-blue-50",
    DIE_GO: "border-green-200 bg-green-50",
    EVENT_PROJECT: "border-emerald-200 bg-emerald-50",
    MASS_PRO: "border-yellow-200 bg-yellow-50",
  };
  const FASE_HEADER_COLORS: Record<string, string> = {
    RFQ: "text-blue-700",
    DIE_GO: "text-green-700",
    EVENT_PROJECT: "text-emerald-700",
    MASS_PRO: "text-yellow-700",
  };

  const addSubFase = async () => {
    if (!addForm.name || !addForm.picId) { toast("error", "Name and PIC are required"); return; }
    setSaving(true);
    const res = await apiFetch(`/api/projects/${projectId}/fases/${fase.id}/subfases`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addForm),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { toast("error", data.error ?? "Failed to add SubPhase"); return; }
    toast("success", "SubPhase added");
    setAddForm({ name: "", description: "", picId: "", picStartDate: "", picTargetDate: "", customerStartDate: "", customerTargetDate: "", documentUrl: "" });
    setShowAddForm(false);
    refetch();
  };

  return (
    <div className={`rounded-xl border-2 ${FASE_COLORS[fase.fase]}`}>
      {/* Phase header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        {expanded ? <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-500 shrink-0" />}
        <span className={`font-bold text-sm ${FASE_HEADER_COLORS[fase.fase]}`}>{FASE_LABELS[fase.fase]}</span>
        <div className="flex-1 h-1.5 bg-white/60 rounded-full mx-2">
          <div className="h-1.5 bg-current rounded-full transition-all" style={{ width: `${progress}%`, color: "inherit" }} />
        </div>
        <span className="text-xs font-semibold text-gray-600 shrink-0">{progress}%</span>
        <span className="text-xs text-gray-500 shrink-0 ml-1">({(fase.subFases ?? []).filter((s) => s.isDone).length}/{(fase.subFases ?? []).length})</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-2">
          {/* SubFases */}
          {(fase.subFases ?? []).length === 0 && !showAddForm && (
            <p className="text-xs text-gray-400 text-center py-4">No subphases yet. Click + to add one.</p>
          )}
          {(fase.subFases ?? []).map((sf) => (
            <SubFaseRow key={sf.id} subFase={sf} users={users} toast={toast} refetch={refetch} />
          ))}

          {/* Add SubFase form */}
          {showAddForm && (
            <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3 mt-2">
              <p className="text-xs font-bold text-gray-700">New SubPhase</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">SubPhase Name *</label>
                  <input value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    placeholder="e.g. Dankaku PP1"
                    className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">PIC SubPhase *</label>
                  <select value={addForm.picId} onChange={(e) => setAddForm({ ...addForm, picId: e.target.value })}
                    className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="">Select PIC...</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.name} - {DEPARTMENT_LABELS[u.department!] ?? u.role}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">PIC Start Date</label>
                  <input type="date" value={addForm.picStartDate} onChange={(e) => setAddForm({ ...addForm, picStartDate: e.target.value })}
                    className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">PIC Target Date</label>
                  <input type="date" value={addForm.picTargetDate} onChange={(e) => setAddForm({ ...addForm, picTargetDate: e.target.value })}
                    className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Customer Start Date</label>
                  <input type="date" value={addForm.customerStartDate} onChange={(e) => setAddForm({ ...addForm, customerStartDate: e.target.value })}
                    className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Customer Target Date</label>
                  <input type="date" value={addForm.customerTargetDate} onChange={(e) => setAddForm({ ...addForm, customerTargetDate: e.target.value })}
                    className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">Document URL</label>
                  <input value={addForm.documentUrl} onChange={(e) => setAddForm({ ...addForm, documentUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">Description</label>
                  <textarea value={addForm.description} onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                    rows={2}
                    className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={addSubFase} disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium disabled:opacity-50">
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                  Add SubPhase
                </button>
                <button onClick={() => setShowAddForm(false)} className="px-3 py-1.5 border border-gray-200 rounded text-xs text-gray-600">Cancel</button>
              </div>
            </div>
          )}

          {!showAddForm && (
            <div className="flex items-center gap-3 mt-1">
              <button onClick={() => setShowAddForm(true)}
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium px-1">
                <Plus className="w-3.5 h-3.5" />
                Add SubPhase
              </button>
              <button
                onClick={() => importInputRef.current?.click()}
                className="flex items-center gap-1.5 text-xs text-green-600 hover:text-green-800 font-medium px-1"
              >
                <Download className="w-3.5 h-3.5" />
                Import Excel
              </button>
              <input
                ref={importInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleImportExcel}
              />
              <button onClick={downloadTemplate}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 font-medium px-1">
                <Download className="w-3.5 h-3.5" />
                Template
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AddSubFaseInlineForm({ projectId, faseId, parentSubFaseId, users, toast, refetch, onClose }: {
  projectId: string;
  faseId: string;
  parentSubFaseId: string;
  users: User[];
  toast: (type: "success" | "error", msg: string) => void;
  refetch: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({ name: "", picId: "", picStartDate: "", picTargetDate: "", customerStartDate: "", customerTargetDate: "" });
  const [saving, setSaving] = useState(false);

  const add = async () => {
    if (!form.name || !form.picId) { toast("error", "Name and PIC are required"); return; }
    setSaving(true);
    const res = await apiFetch(`/api/projects/${projectId}/fases/${faseId}/subfases`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, parentSubFaseId }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { toast("error", data.error ?? "Failed to add"); return; }
    toast("success", "Sub-Subphase added");
    onClose();
    refetch();
  };

  return (
    <div className="bg-gray-50 rounded-lg border border-dashed border-gray-300 p-3 space-y-2">
      <p className="text-xs font-bold text-gray-600">New Sub-Subphase</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Sub-subphase name *"
            className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        <div className="col-span-2">
          <select value={form.picId} onChange={(e) => setForm({ ...form, picId: e.target.value })}
            className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500">
            <option value="">Select PIC *</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div>
          <input type="date" value={form.picStartDate} onChange={(e) => setForm({ ...form, picStartDate: e.target.value })}
            placeholder="PIC Start"
            className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        <div>
          <input type="date" value={form.picTargetDate} onChange={(e) => setForm({ ...form, picTargetDate: e.target.value })}
            placeholder="PIC Target"
            className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={add} disabled={saving}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 text-white rounded text-xs font-medium disabled:opacity-50">
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
          Add
        </button>
        <button onClick={onClose} className="px-2.5 py-1.5 border border-gray-200 rounded text-xs text-gray-600">Cancel</button>
      </div>
    </div>
  );
}

function patchProjectCache(
  queryClient: ReturnType<typeof useQueryClient>,
  projectId: string,
  updater: (sf: SubFase) => SubFase | null
) {
  queryClient.setQueryData<Project>(["project", projectId], (old) => {
    if (!old) return old;
    return {
      ...old,
      fases: old.fases?.map((f) => ({
        ...f,
        subFases: (f.subFases ?? [])
          .map((sf) => updater(sf))
          .filter(Boolean) as SubFase[],
      })),
    };
  });
}

const SubFaseRow = memo(function SubFaseRow({ subFase, users, toast, refetch }: {
  subFase: SubFase;
  users: User[];
  toast: (type: "success" | "error", msg: string) => void;
  refetch: () => void;
}) {
  const queryClient = useQueryClient();
  const [localIsDone, setLocalIsDone] = useState(subFase.isDone);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showChildForm, setShowChildForm] = useState(false);
  const [highlighted, setHighlighted] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hlId = sessionStorage.getItem("highlightSubFaseId");
    if (hlId === subFase.id) {
      sessionStorage.removeItem("highlightSubFaseId");
      setHighlighted(true);
      rowRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => setHighlighted(false), 2500);
    }
  }, [subFase.id]);
  const [editForm, setEditForm] = useState({
    name: subFase.name,
    picId: subFase.picId,
    picStartDate: subFase.picStartDate?.slice(0, 10) ?? "",
    picTargetDate: subFase.picTargetDate?.slice(0, 10) ?? "",
    customerStartDate: subFase.customerStartDate?.slice(0, 10) ?? "",
    customerTargetDate: subFase.customerTargetDate?.slice(0, 10) ?? "",
    documentUrl: subFase.documentUrl ?? "",
    description: subFase.description ?? "",
  });

  // Keep in sync if parent refetches
  useState(() => { setLocalIsDone(subFase.isDone); });

  const toggle = async () => {
    const newValue = !localIsDone;
    // Optimistic: update UI immediately
    setLocalIsDone(newValue);
    patchProjectCache(queryClient, subFase.projectId, (sf) =>
      sf.id === subFase.id ? { ...sf, isDone: newValue } : sf
    );
    const res = await apiFetch(`/api/subfases/${subFase.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDone: newValue }),
    });
    if (!res.ok) {
      // Revert on error
      setLocalIsDone(!newValue);
      patchProjectCache(queryClient, subFase.projectId, (sf) =>
        sf.id === subFase.id ? { ...sf, isDone: !newValue } : sf
      );
      toast("error", "Failed to update SubPhase");
      return;
    }
    refetch(); // Background sync (progress bars etc)
  };

  const saveEdit = async () => {
    setSaving(true);
    const res = await apiFetch(`/api/subfases/${subFase.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editForm.name,
        picId: editForm.picId,
        picStartDate: editForm.picStartDate || null,
        picTargetDate: editForm.picTargetDate || null,
        customerStartDate: editForm.customerStartDate || null,
        customerTargetDate: editForm.customerTargetDate || null,
        documentUrl: editForm.documentUrl || null,
        description: editForm.description || null,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { toast("error", "Failed to update SubPhase"); return; }
    // Update cache with server response — no refetch needed
    patchProjectCache(queryClient, subFase.projectId, (sf) =>
      sf.id === subFase.id ? { ...sf, ...data } : sf
    );
    toast("success", "SubPhase updated");
    setEditing(false);
  };

  const del = async () => {
    if (!confirm(`Delete SubPhase "${subFase.name}"?`)) return;
    // Optimistic: remove from cache immediately
    patchProjectCache(queryClient, subFase.projectId, (sf) =>
      sf.id === subFase.id ? null : sf
    );
    const res = await apiFetch(`/api/subfases/${subFase.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast("error", "Failed to delete SubPhase");
      refetch(); // Restore on error
      return;
    }
    toast("success", "SubPhase deleted");
  };

  const now = new Date();
  const picTarget = subFase.picTargetDate ? new Date(subFase.picTargetDate) : null;
  const diffPic = picTarget ? Math.ceil((picTarget.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

  let statusDot = "bg-blue-400";
  if (localIsDone) statusDot = "bg-green-500";
  else if (diffPic !== null && diffPic < 0) statusDot = "bg-red-500";
  else if (diffPic !== null && diffPic <= 3) statusDot = "bg-yellow-400";

  if (editing) {
    return (
      <div className="bg-white rounded-lg border border-blue-200 px-3 py-3 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1">SubPhase Name *</label>
            <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1">PIC *</label>
            <select value={editForm.picId} onChange={(e) => setEditForm({ ...editForm, picId: e.target.value })}
              className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name} - {DEPARTMENT_LABELS[u.department!] ?? u.role}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">PIC Start Date</label>
            <input type="date" value={editForm.picStartDate} onChange={(e) => setEditForm({ ...editForm, picStartDate: e.target.value })}
              className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">PIC Target Date</label>
            <input type="date" value={editForm.picTargetDate} onChange={(e) => setEditForm({ ...editForm, picTargetDate: e.target.value })}
              className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Customer Start Date</label>
            <input type="date" value={editForm.customerStartDate} onChange={(e) => setEditForm({ ...editForm, customerStartDate: e.target.value })}
              className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Customer Target Date</label>
            <input type="date" value={editForm.customerTargetDate} onChange={(e) => setEditForm({ ...editForm, customerTargetDate: e.target.value })}
              className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Document URL</label>
            <input value={editForm.documentUrl} onChange={(e) => setEditForm({ ...editForm, documentUrl: e.target.value })}
              placeholder="https://..."
              className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Description</label>
            <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              rows={2}
              className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={saveEdit} disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium disabled:opacity-50">
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            Save
          </button>
          <button onClick={() => setEditing(false)} className="px-3 py-1.5 border border-gray-200 rounded text-xs text-gray-600">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div ref={rowRef} className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors duration-700 ${highlighted ? "bg-yellow-50 border-yellow-400" : localIsDone ? "bg-white border-green-200 opacity-75" : "bg-white border-gray-200"}`}>
        <button
          onClick={toggle}
          className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${localIsDone ? "bg-green-500 border-green-500" : "border-gray-300 hover:border-blue-400"}`}
        >
          {localIsDone && <Check className="w-3 h-3 text-white" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full shrink-0 ${statusDot}`} />
            <p className={`text-sm font-medium ${localIsDone ? "line-through text-gray-400" : "text-gray-900"}`}>{subFase.name}</p>
            {subFase.documentUrl && (
              <a href={subFase.documentUrl} target="_blank" rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-700" title="Open document">
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500 flex-wrap">
            <span>PIC: <span className="font-medium">{subFase.pic?.name ?? "-"}</span></span>
            {subFase.picTargetDate && <span>PIC Target: {formatDate(subFase.picTargetDate)}</span>}
            {subFase.customerTargetDate && <span>Cust Target: {formatDate(subFase.customerTargetDate)}</span>}
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button onClick={() => setEditing(true)} className="p-1 text-blue-500 hover:text-blue-600 rounded transition-colors">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={del} className="p-1 text-red-500 hover:text-red-600 rounded transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Children (sub-subphases) */}
      {((subFase.children ?? []).length > 0 || showChildForm) && (
        <div className="ml-8 space-y-1.5 border-l-2 border-gray-200 pl-3">
          {(subFase.children ?? []).map((child) => (
            <SubFaseRow key={child.id} subFase={child} users={users} toast={toast} refetch={refetch} />
          ))}
          {showChildForm && (
            <AddSubFaseInlineForm
              projectId={subFase.projectId}
              faseId={subFase.projectFaseId}
              parentSubFaseId={subFase.id}
              users={users}
              toast={toast}
              refetch={refetch}
              onClose={() => setShowChildForm(false)}
            />
          )}
        </div>
      )}

      {/* Add sub-subphase button */}
      {!showChildForm && (
        <button
          onClick={() => setShowChildForm(true)}
          className="ml-8 flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 transition-colors px-1"
        >
          <Plus className="w-3 h-3" /> Add Sub-Subphase
        </button>
      )}
    </div>
  );
});

// ─── Hinanhyo Tab ─────────────────────────────────────────────────────────────

function HinanhyoTab({ detail, toast, refetch }: {
  detail: Project;
  toast: (type: "success" | "error", msg: string) => void;
  refetch: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: "HINANHYO", title: "", description: "", status: "PENDING", subFaseId: "" });
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState<string>("ALL");

  const { data: items = [], refetch: refetchHinanhyo } = useQuery<HinanhyoDR[]>({
    queryKey: ["hinanhyo", detail.id],
    queryFn: () => apiFetch(`/api/projects/${detail.id}/hinanhyo`).then((r) => r.json()),
  });

  const allSubFases = (detail.fases ?? []).flatMap((f) => (f.subFases ?? []).map((sf) => ({ ...sf, faseName: FASE_LABELS[f.fase] })));

  const filteredItems = filterType === "ALL"
    ? items
    : items.filter((item) => item.type === filterType);

  const add = async () => {
    if (!form.title) { toast("error", "Title is required"); return; }
    setSaving(true);
    const res = await apiFetch(`/api/projects/${detail.id}/hinanhyo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, subFaseId: form.subFaseId || null }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { toast("error", data.error ?? "Failed"); return; }
    toast("success", "Item added");
    setForm({ type: "HINANHYO", title: "", description: "", status: "PENDING", subFaseId: "" });
    setShowForm(false);
    refetchHinanhyo();
  };

  const updateStatus = async (id: string, status: string) => {
    await apiFetch(`/api/hinanhyo/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    refetchHinanhyo();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    await apiFetch(`/api/hinanhyo/${id}`, { method: "DELETE" });
    refetchHinanhyo();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">Hinanhyo / DR / Komarigoto / VA</h3>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium">
          <Plus className="w-3.5 h-3.5" /> Add Item
        </button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-gray-500">Filter by Type:</span>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">All Types</option>
          {Object.entries(HINANHYO_TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <span className="text-xs text-gray-400 ml-2">
          Showing {filteredItems.length} of {items.length} items
        </span>
      </div>

      {showForm && (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Type *</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {Object.entries(HINANHYO_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Location (SubPhase)</label>
              <select value={form.subFaseId} onChange={(e) => setForm({ ...form, subFaseId: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">General (no specific SubPhase)</option>
                {allSubFases.map((sf) => (
                  <option key={sf.id} value={sf.id}>{sf.faseName} - {sf.name}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Title *</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Issue title..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {Object.entries(HINANHYO_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={add} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Add
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">Cancel</button>
          </div>
        </div>
      )}

      {filteredItems.length === 0 ? (  // <-- GANTI: items jadi filteredItems
        <p className="text-sm text-gray-400 text-center py-8">
          {items.length === 0 ? "No items yet" : "No items match the selected filter"}
        </p>
      ) : (
        <div className="space-y-2">
          {filteredItems.map((item) => (  // <-- GANTI: items jadi filteredItems
            <HinanhyoRow
              key={item.id}
              item={item}
              allSubFases={allSubFases}
              onDelete={() => del(item.id)}
              onRefetch={refetchHinanhyo}
              toast={toast}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Hinanhyo Row ─────────────────────────────────────────────────────────────

function HinanhyoRow({ item, allSubFases, onDelete, onRefetch, toast }: {
  item: HinanhyoDR;
  allSubFases: (SubFase & { faseName: string })[];
  onDelete: () => void;
  onRefetch: () => void;
  toast: (type: "success" | "error", msg: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    title: item.title,
    description: item.description ?? "",
    type: item.type,
    subFaseId: item.subFaseId ?? "",
    status: item.status,
  });

  const save = async () => {
    setSaving(true);
    const res = await apiFetch(`/api/hinanhyo/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: editForm.title,
        description: editForm.description || null,
        type: editForm.type,
        subFaseId: editForm.subFaseId || null,
        status: editForm.status,
      }),
    });
    setSaving(false);
    if (!res.ok) { toast("error", "Failed to update item"); return; }
    toast("success", "Item updated");
    setEditing(false);
    onRefetch();
  };

  if (editing) {
    return (
      <div className="bg-white border border-blue-200 rounded-lg p-3 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Type</label>
            <select value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value as HinanhyoDRType })}
              className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500">
              {Object.entries(HINANHYO_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Status</label>
            <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value as HinanhyoDRStatus })}
              className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500">
              {Object.entries(HINANHYO_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">SubPhase</label>
            <select value={editForm.subFaseId} onChange={(e) => setEditForm({ ...editForm, subFaseId: e.target.value })}
              className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="">General</option>
              {allSubFases.map((sf) => (
                <option key={sf.id} value={sf.id}>{sf.faseName} - {sf.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Title *</label>
            <input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Description</label>
            <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              rows={2}
              className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={save} disabled={saving}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium disabled:opacity-50">
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            Save
          </button>
          <button onClick={() => setEditing(false)} className="px-3 py-1.5 border border-gray-200 rounded text-xs text-gray-600">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-100 rounded-lg p-3 flex items-start gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{HINANHYO_TYPE_LABELS[item.type]}</span>
          {item.subFase && (
            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">@ {item.subFase.name}</span>
          )}
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getHinanhyoStatusColor(item.status)}`}>
            {HINANHYO_STATUS_LABELS[item.status]}
          </span>
        </div>
        <p className="text-sm font-medium text-gray-900 mt-1">{item.title}</p>
        {item.description && <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>}
        <p className="text-xs text-gray-400 mt-1">{formatDate(item.createdAt)}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={() => setEditing(true)} className="p-1 text-gray-300 hover:text-blue-500 rounded">
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button onClick={onDelete} className="p-1 text-gray-300 hover:text-red-500 rounded">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Manpower Tab ─────────────────────────────────────────────────────────────

function ManpowerTab({ detail, onUpdate, toast, refetch }: {
  detail: Project;
  onUpdate: (p: Project) => void;
  toast: (type: "success" | "error", msg: string) => void;
  refetch: () => void;
}) {
  const [kebutuhanMp, setKebutuhanMp] = useState(String(detail.kebutuhanMp ?? ""));
  const [aktualMp, setAktualMp] = useState(String(detail.aktualMp ?? ""));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!kebutuhanMp || parseInt(kebutuhanMp) < 1) { toast("error", "Required MP must be at least 1"); return; }
    setSaving(true);
    const res = await apiFetch(`/api/projects/${detail.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kebutuhanMp, aktualMp: aktualMp || null }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { toast("error", data.error ?? "Update failed"); return; }
    toast("success", "Manpower updated");
    onUpdate(data);
    refetch();
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-800">Manpower</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-xs font-medium text-gray-500 mb-1">Required MP</p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              value={kebutuhanMp}
              onChange={(e) => setKebutuhanMp(e.target.value)}
              placeholder="-"
              className="w-24 border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-xs text-gray-400">persons</span>
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-xs font-medium text-gray-500 mb-1">Actual MP</p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              value={aktualMp}
              onChange={(e) => setAktualMp(e.target.value)}
              placeholder="-"
              className="w-24 border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-xs text-gray-400">persons</span>
          </div>
        </div>
      </div>
      <button onClick={save} disabled={saving}
        className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium disabled:opacity-50">
        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
        Save
      </button>
      {detail.aktualMp && detail.aktualMp > detail.kebutuhanMp && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-700">
          ⚠ Actual MP exceeds required by {detail.aktualMp - detail.kebutuhanMp} person(s) ({Math.round(((detail.aktualMp - detail.kebutuhanMp) / detail.kebutuhanMp) * 100)}% over)
        </div>
      )}
    </div>
  );
}

// ─── Cycle Time Tab ──────────────────────────────────────────────────────────

type CtGroup = { group: string; value: number | null };

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function getNextGroupLabel(groups: CtGroup[]): string {
  return ALPHABET[groups.length] ?? `G${groups.length + 1}`;
}

function CycleTimeTab({ detail, onUpdate, toast, refetch }: {
  detail: Project;
  onUpdate: (p: Project) => void;
  toast: (type: "success" | "error", msg: string) => void;
  refetch: () => void;
}) {
  const rawGroups = Array.isArray(detail.aktualCt) ? (detail.aktualCt as CtGroup[]) : [];
  const [targetCt, setTargetCt] = useState(detail.targetCt !== null && detail.targetCt !== undefined ? String(detail.targetCt) : "");
  const [groups, setGroups] = useState<CtGroup[]>(rawGroups);
  const [savingTarget, setSavingTarget] = useState(false);
  const [savingGroups, setSavingGroups] = useState(false);

  const saveTarget = async () => {
    setSavingTarget(true);
    const res = await apiFetch(`/api/projects/${detail.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetCt: targetCt !== "" ? parseFloat(targetCt) : null }),
    });
    const data = await res.json();
    setSavingTarget(false);
    if (!res.ok) { toast("error", data.error ?? "Update failed"); return; }
    toast("success", "Target Cycle Time saved");
    onUpdate(data);
    refetch();
  };

  const saveGroups = async () => {
    setSavingGroups(true);
    const res = await apiFetch(`/api/projects/${detail.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aktualCt: groups }),
    });
    const data = await res.json();
    setSavingGroups(false);
    if (!res.ok) { toast("error", data.error ?? "Update failed"); return; }
    toast("success", "Actual Cycle Time saved");
    onUpdate(data);
    refetch();
  };

  const addGroup = () => {
    const label = getNextGroupLabel(groups);
    setGroups((prev) => [...prev, { group: label, value: null }]);
  };

  const removeLastGroup = () => {
    setGroups((prev) => prev.slice(0, -1));
  };

  const updateGroupValue = (index: number, val: string) => {
    setGroups((prev) =>
      prev.map((g, i) => (i === index ? { ...g, value: val !== "" ? parseFloat(val) : null } : g))
    );
  };

  return (
    <div className="space-y-6">
      <h3 className="font-semibold text-gray-800">Cycle Time</h3>

      {/* Target CT */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Target Cycle Time</p>
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="number"
              min="0"
              step="any"
              value={targetCt}
              onChange={(e) => setTargetCt(e.target.value)}
              placeholder="-"
              className="w-36 border border-gray-200 rounded-lg px-3 py-2 text-lg font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-14"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">CT</span>
          </div>
          <button
            onClick={saveTarget}
            disabled={savingTarget}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {savingTarget ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save
          </button>
        </div>
      </div>

      {/* Actual CT per Group */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Actual Cycle Time per Group</p>
          <div className="flex items-center gap-2">
            {groups.length > 0 && (
              <button
                onClick={removeLastGroup}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                Delete Group {groups[groups.length - 1]?.group}
              </button>
            )}
            {groups.length < 26 && (
              <button
                onClick={addGroup}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Group
              </button>
            )}
          </div>
        </div>

        {groups.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-400 mb-3">
              No groups yet. Click <span className="font-medium text-blue-500">Add Group</span> to create one.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
              {groups.map((g, i) => (
                <div key={g.group} className="bg-white rounded-lg border border-gray-200 p-3">
                  <p className="text-xs font-bold text-gray-500 mb-2">
                    Group <span className="text-blue-600 text-sm">{g.group}</span>
                  </p>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={g.value !== null && g.value !== undefined ? String(g.value) : ""}
                      onChange={(e) => updateGroupValue(i, e.target.value)}
                      placeholder="-"
                      className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 pr-12"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">CT</span>
                  </div>
                  {detail.targetCt !== null && detail.targetCt !== undefined && g.value !== null && g.value !== undefined && (
                    <p className={`text-xs mt-1.5 font-medium ${g.value >= detail.targetCt ? "text-green-600" : "text-red-500"}`}>
                      {g.value >= detail.targetCt
                        ? `✓ +${(g.value - detail.targetCt).toFixed(2)} above target`
                        : `⚠ -${(detail.targetCt - g.value).toFixed(2)} below target`}
                    </p>
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={saveGroups}
                disabled={savingGroups}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {savingGroups ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save All Groups
              </button>
              {detail.targetCt !== null && detail.targetCt !== undefined && groups.some(g => g.value !== null) && (() => {
                const filled = groups.filter(g => g.value !== null);
                const avg = filled.reduce((sum, g) => sum + (g.value ?? 0), 0) / filled.length;
                return (
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    avg >= detail.targetCt
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}>
                    Avg: {avg.toFixed(2)} {avg >= detail.targetCt ? "✓ reaches target" : "⚠ below target"}
                  </span>
                );
              })()}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Schedule Customer Tab ────────────────────────────────────────────────────

type ScheduleRevision = {
  id: string;
  revisionDate: string;
  rfqDate: string | null;
  dieGoDate: string | null;
  pp1Date: string | null;
  pp2Date: string | null;
  pp3Date: string | null;
  mpDate: string | null;
  notes: string | null;
};

const SCHEDULE_MILESTONES = [
  { key: "rfqDate", label: "RFQ" },
  { key: "dieGoDate", label: "DIEGO" },
  { key: "pp1Date", label: "PP1" },
  { key: "pp2Date", label: "PP2" },
  { key: "pp3Date", label: "PP3" },
  { key: "mpDate", label: "MP" },
] as const;

function fmtScheduleDate(d: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
}

function isScheduleChanged(rev: ScheduleRevision, prev: ScheduleRevision | null, key: string): boolean {
  if (!prev) return false;
  const a = (rev as Record<string, unknown>)[key] ? new Date((rev as Record<string, unknown>)[key] as string).toDateString() : null;
  const b = (prev as Record<string, unknown>)[key] ? new Date((prev as Record<string, unknown>)[key] as string).toDateString() : null;
  return a !== b;
}

function ScheduleTab({ detail, toast }: {
  detail: Project;
  toast: (type: "success" | "error", msg: string) => void;
}) {
  const { t } = useLanguage();
  const sc = t.modal.schedule;
  const { data: revisions = [], refetch } = useQuery<ScheduleRevision[]>({
    queryKey: ["schedule", detail.id],
    queryFn: () => apiFetch(`/api/projects/${detail.id}/schedule`).then((r) => r.json()),
  });

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const emptyForm = { revisionDate: "", rfqDate: "", dieGoDate: "", pp1Date: "", pp2Date: "", pp3Date: "", mpDate: "", notes: "" };
  const [form, setForm] = useState(emptyForm);

  const add = async () => {
    if (!form.revisionDate) { toast("error", sc.toastValidation); return; }
    if (revisions.length > 0) {
      const latest = revisions[revisions.length - 1];
      if (new Date(form.revisionDate) < new Date(latest.revisionDate)) {
        toast("error", `${sc.toastDateOrder} (${fmtScheduleDate(latest.revisionDate)})`);
        return;
      }
      if (form.revisionDate === latest.revisionDate.slice(0, 10)) {
        toast("error", sc.toastDuplicate);
        return;
      }
    }
    setSaving(true);
    const res = await apiFetch(`/api/projects/${detail.id}/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { toast("error", data.error ?? sc.toastSaveError); return; }
    toast("success", sc.toastAdded);
    setForm(emptyForm);
    setShowForm(false);
    refetch();
  };

  const del = async (id: string) => {
    if (!confirm(sc.confirmDelete)) return;
    const res = await apiFetch(`/api/projects/${detail.id}/schedule?revisionId=${id}`, { method: "DELETE" });
    if (!res.ok) { toast("error", sc.toastDeleteError); return; }
    toast("success", sc.toastDeleted);
    refetch();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">{sc.title}</h3>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium">
          <Plus className="w-3.5 h-3.5" /> {sc.addRevision}
        </button>
      </div>

      {showForm && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-3">
          <p className="text-xs font-bold text-indigo-800">{sc.formTitle}</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">{sc.formDate}</label>
              <input type="date" value={form.revisionDate} onChange={(e) => setForm({ ...form, revisionDate: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            {SCHEDULE_MILESTONES.map((m) => (
              <div key={m.key}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{m.label} Date</label>
                <input type="date" value={(form as Record<string, string>)[m.key]} onChange={(e) => setForm({ ...form, [m.key]: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            ))}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">{sc.formNotes}</label>
              <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder={sc.formNotesPh}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={add} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-medium disabled:opacity-50">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {sc.save}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-xs text-gray-600">{sc.cancel}</button>
          </div>
        </div>
      )}

      {revisions.length === 0 ? (
        <div className="py-12 text-center text-gray-400 bg-gray-50 rounded-xl">
          <p className="text-sm">{sc.noData}</p>
          <p className="text-xs mt-1">{sc.noDataSub}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {revisions.map((rev, i) => {
            const prev = i > 0 ? revisions[i - 1] : null;
            return (
              <div key={rev.id} className="border border-gray-200 rounded-2xl p-5 bg-white shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                    Revisi &nbsp;
                    <span className="text-blue-700 text-sm normal-case tracking-normal">
                      {new Date(rev.revisionDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })}
                    </span>
                  </p>
                  <button onClick={() => del(rev.id)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Timeline */}
                <div className="mt-4 mb-1">
                  {/* Line + dots */}
                  <div className="relative h-7 flex items-center">
                    {/* Horizontal line through center */}
                    <div className="absolute inset-x-0 top-1/2 h-[3px] bg-gray-300 -translate-y-1/2 rounded-full" />
                    {/* Dots */}
                    {SCHEDULE_MILESTONES.map((m) => (
                      <div key={m.key} className="flex-1 flex justify-center relative z-10">
                        <div className="w-7 h-7 rounded-full bg-yellow-400 border-[3px] border-yellow-600 shadow" />
                      </div>
                    ))}
                  </div>

                  {/* Labels + dates below dots */}
                  <div className="flex mt-2">
                    {SCHEDULE_MILESTONES.map((m) => {
                      const changed = isScheduleChanged(rev, prev, m.key);
                      const val = (rev as Record<string, unknown>)[m.key] as string | null;
                      return (
                        <div key={m.key} className="flex-1 text-center">
                          <p className="text-[11px] font-bold text-gray-700">{m.label}</p>
                          <p className={`text-[10px] mt-0.5 leading-tight whitespace-nowrap ${changed ? "text-blue-600 font-semibold" : "text-gray-500"}`}>
                            {fmtScheduleDate(val)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {rev.notes && (
                  <p className="text-xs text-gray-400 mt-3 italic">{rev.notes}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {revisions.length > 0 && (
        <p className="text-[10px] text-gray-400">
          <span className="text-blue-600 font-semibold">Blue</span> {sc.legend}
        </p>
      )}
    </div>
  );
}

// ─── Minutes Meeting Tab ──────────────────────────────────────────────────────

type MeetingNote = {
  id: string;
  recordingDate: string;
  informasiUntuk: string | null;
  departemen: string | null;
  deskripsi: string;
  followUpDate: string | null;
  isDone: boolean;
  createdAt: string;
  createdBy: { id: string; name: string };
};

function MinutesMeetingTab({ detail, toast }: {
  detail: Project;
  toast: (type: "success" | "error", msg: string) => void;
}) {
  const { t } = useLanguage();
  const mt = t.modal.meeting;
  const queryClient = useQueryClient();
  const { data: notes = [], refetch } = useQuery<MeetingNote[]>({
    queryKey: ["meeting-notes", detail.id],
    queryFn: () => apiFetch(`/api/minutes-meeting?projectId=${detail.id}`).then((r) => r.json()),
  });

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const emptyForm = {
    recordingDate: new Date().toISOString().slice(0, 10),
    informasiUntuk: "",
    departemen: "",
    deskripsi: "",
    followUpDate: "",
  };
  const [form, setForm] = useState(emptyForm);

  const add = async () => {
    if (!form.recordingDate || !form.deskripsi) { toast("error", mt.toastValidation); return; }
    setSaving(true);
    const res = await apiFetch("/api/minutes-meeting", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, projectId: detail.id }),
    });
    setSaving(false);
    if (!res.ok) { toast("error", mt.toastSaveError); return; }
    toast("success", mt.toastSaved);
    setForm(emptyForm);
    setShowForm(false);
    refetch();
  };

  const toggleDone = async (note: MeetingNote) => {
    queryClient.setQueryData<MeetingNote[]>(["meeting-notes", detail.id], (old) =>
      old?.map((n) => n.id === note.id ? { ...n, isDone: !n.isDone } : n) ?? []
    );
    const res = await apiFetch(`/api/minutes-meeting/${note.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDone: !note.isDone }),
    });
    if (!res.ok) { queryClient.invalidateQueries({ queryKey: ["meeting-notes", detail.id] }); toast("error", mt.toastStatusError); }
  };

  const del = async (id: string) => {
    if (!confirm(mt.confirmDelete)) return;
    queryClient.setQueryData<MeetingNote[]>(["meeting-notes", detail.id], (old) =>
      old?.filter((n) => n.id !== id) ?? []
    );
    const res = await apiFetch(`/api/minutes-meeting/${id}`, { method: "DELETE" });
    if (!res.ok) { queryClient.invalidateQueries({ queryKey: ["meeting-notes", detail.id] }); toast("error", mt.toastDeleteError); }
    else toast("success", mt.toastDeleted);
  };

  const pending = notes.filter((n) => !n.isDone).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-800">{mt.heading}</h3>
          {pending > 0 && <p className="text-xs text-amber-600 mt-0.5">{pending} {mt.pendingWarning}</p>}
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700"
        >
          <Plus className="w-3.5 h-3.5" /> {mt.addBtn}
        </button>
      </div>

      {showForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
          <p className="text-xs font-bold text-blue-800">{mt.formTitle}</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{mt.formDate}</label>
              <input type="date" value={form.recordingDate} onChange={(e) => setForm({ ...form, recordingDate: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{mt.formFollowUp}</label>
              <input type="date" value={form.followUpDate} onChange={(e) => setForm({ ...form, followUpDate: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{mt.formInfoFor}</label>
              <input value={form.informasiUntuk} onChange={(e) => setForm({ ...form, informasiUntuk: e.target.value })}
                placeholder={mt.formInfoForPh} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{mt.formDept}</label>
              <input value={form.departemen} onChange={(e) => setForm({ ...form, departemen: e.target.value })}
                placeholder={mt.formDeptPh} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">{mt.formDesc}</label>
              <textarea value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
                placeholder={mt.formDescPh} rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={add} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium disabled:opacity-50">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {mt.save}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-xs text-gray-600">{mt.cancel}</button>
          </div>
        </div>
      )}

      {notes.length === 0 ? (
        <div className="py-10 text-center text-gray-400 bg-gray-50 rounded-xl">
          <p className="text-sm">{mt.noData}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <div key={note.id} className={`rounded-xl border p-3.5 transition-colors ${note.isDone ? "bg-gray-50 border-gray-100 opacity-70" : "bg-white border-gray-200"}`}>
              <div className="flex items-start gap-3">
                <button onClick={() => toggleDone(note)}
                  className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${note.isDone ? "bg-green-500 border-green-500" : "border-gray-300 hover:border-green-400"}`}>
                  {note.isDone && <Check className="w-2.5 h-2.5 text-white" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-snug ${note.isDone ? "line-through text-gray-400" : "text-gray-800"}`}>{note.deskripsi}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
                    <span>{formatDate(note.recordingDate)}</span>
                    {note.informasiUntuk && <span>{mt.infoFor} <span className="text-gray-600">{note.informasiUntuk}</span></span>}
                    {note.followUpDate && (
                      <span className={new Date(note.followUpDate) < new Date() && !note.isDone ? "text-red-500 font-medium" : ""}>
                        {mt.followUp} {formatDate(note.followUpDate)}
                      </span>
                    )}
                    <span>{mt.by} {note.createdBy.name}</span>
                  </div>
                </div>
                <button onClick={() => del(note.id)} className="p-1 text-red-400 hover:text-red-600 rounded transition-colors shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-[10px] text-gray-400">
        {mt.editLink} <a href="/minutes-meeting" className="underline text-blue-500">{mt.editLinkLabel}</a>.
      </p>
    </div>
  );
}

// ─── Activity Tab ─────────────────────────────────────────────────────────────

function ActivityTab({ detail }: { detail: Project }) {
  const { data: logs = [] } = useQuery<ActivityLog[]>({
    queryKey: ["activity", detail.id],
    queryFn: () => apiFetch(`/api/projects/${detail.id}/activity`).then((r) => r.json()),
  });

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-gray-800">Activity Log</h3>
      {logs.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No activity yet</p>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
              <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold text-blue-600">
                  {((log as ActivityLog & { user?: { name: string } }).user?.name ?? "?").charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-900">{(log as ActivityLog & { user?: { name: string } }).user?.name ?? "Unknown"}</span>
                  <span className="text-xs font-semibold text-gray-500">{log.action}</span>
                </div>
                {log.detail && <p className="text-xs text-gray-500 mt-0.5">{log.detail}</p>}
                <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(log.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
