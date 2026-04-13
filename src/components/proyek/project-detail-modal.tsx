"use client";
import { apiFetch } from "@/lib/fetch-client";

import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X, Plus, Save, Loader2, Download, Check, Trash2, ChevronDown, ChevronRight, Edit2, ExternalLink, CheckCircle2 } from "lucide-react";
import * as XLSX from "xlsx";
import { useToast } from "@/components/layout/toast-context";
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
import type { Project, HinanhyoDR, HinanhyoDRType, HinanhyoDRStatus, ActivityLog, User, ProjectFase, SubFase, FaseType } from "@/types";

interface Props {
  project: Project;
  onClose: () => void;
  onUpdate: (p: Project) => void;
}

type Tab = "info" | "phases" | "hinanhyo" | "mp" | "activity";

export function ProjectDetailModal({ project, onClose, onUpdate }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("info");

  // Fetch full project detail
  const { data: detail, refetch } = useQuery<Project>({
    queryKey: ["project", project.id],
    queryFn: () => apiFetch(`/api/projects/${project.id}`).then((r) => r.json()),
    initialData: project,
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: () => apiFetch("/api/users").then((r) => r.json()),
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

  const tabs: { id: Tab; label: string }[] = [
    { id: "info", label: "General Info" },
    { id: "phases", label: "Phases & SubPhases" },
    { id: "hinanhyo", label: "Hinanhyo / DR" },
    { id: "mp", label: "Manpower" },
    { id: "activity", label: "Activity Log" },
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
            <p className="text-sm text-gray-500">{detail.model} — {detail.customer}</p>
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
        <div className="flex border-b border-gray-100 px-6 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${tab === t.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === "info" && <InfoTab detail={detail} users={users} onUpdate={onUpdate} toast={toast} refetch={refetch} />}
          {tab === "phases" && <PhasesTab detail={detail} users={users} toast={toast} refetch={refetch} queryClient={queryClient} onUpdate={onUpdate} />}
          {tab === "hinanhyo" && <HinanhyoTab detail={detail} toast={toast} refetch={refetch} />}
          {tab === "mp" && <ManpowerTab detail={detail} onUpdate={onUpdate} toast={toast} refetch={refetch} />}
          {tab === "activity" && <ActivityTab detail={detail} />}
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
          <label className="block text-xs font-semibold text-gray-600 mb-1">Assy Name</label>
          <input value={form.assName} onChange={(e) => setForm({ ...form, assName: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Customer</label>
          <input value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Project Leader</label>
          <select value={form.projectLeaderId} onChange={(e) => setForm({ ...form, projectLeaderId: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name} — {DEPARTMENT_LABELS[u.department!] ?? u.role}</option>
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
  console.log("USERS: ", users)
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
                      <option key={u.id} value={u.id}>{u.name} — {DEPARTMENT_LABELS[u.department!] ?? u.role}</option>
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

function SubFaseRow({ subFase, users, toast, refetch }: {
  subFase: SubFase;
  users: User[];
  toast: (type: "success" | "error", msg: string) => void;
  refetch: () => void;
}) {
  const [toggling, setToggling] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
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

  const toggle = async () => {
    setToggling(true);
    const res = await apiFetch(`/api/subfases/${subFase.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDone: !subFase.isDone }),
    });
    setToggling(false);
    if (!res.ok) { toast("error", "Failed to update SubPhase"); return; }
    refetch();
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
    setSaving(false);
    if (!res.ok) { toast("error", "Failed to update SubPhase"); return; }
    toast("success", "SubPhase updated");
    setEditing(false);
    refetch();
  };

  const del = async () => {
    if (!confirm(`Delete SubPhase "${subFase.name}"?`)) return;
    const res = await apiFetch(`/api/subfases/${subFase.id}`, { method: "DELETE" });
    if (!res.ok) { toast("error", "Failed to delete SubPhase"); return; }
    toast("success", "SubPhase deleted");
    refetch();
  };

  const now = new Date();
  const picTarget = subFase.picTargetDate ? new Date(subFase.picTargetDate) : null;
  const diffPic = picTarget ? Math.ceil((picTarget.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

  let statusDot = "bg-blue-400";
  if (subFase.isDone) statusDot = "bg-green-500";
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
                <option key={u.id} value={u.id}>{u.name} — {DEPARTMENT_LABELS[u.department!] ?? u.role}</option>
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
    <div className={`flex items-start gap-3 bg-white rounded-lg border px-3 py-2.5 ${subFase.isDone ? "border-green-200 opacity-75" : "border-gray-200"}`}>
      <button
        onClick={toggle}
        disabled={toggling}
        className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${subFase.isDone ? "bg-green-500 border-green-500" : "border-gray-300 hover:border-blue-400"
          }`}
      >
        {toggling ? <Loader2 className="w-3 h-3 animate-spin text-white" /> : subFase.isDone && <Check className="w-3 h-3 text-white" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full shrink-0 ${statusDot}`} />
          <p className={`text-sm font-medium ${subFase.isDone ? "line-through text-gray-400" : "text-gray-900"}`}>{subFase.name}</p>
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
  );
}

// ─── Hinanhyo Tab ─────────────────────────────────────────────────────────────

function HinanhyoTab({ detail, toast, refetch }: {
  detail: Project;
  toast: (type: "success" | "error", msg: string) => void;
  refetch: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: "HINANHYO", title: "", description: "", status: "PENDING", subFaseId: "" });
  const [saving, setSaving] = useState(false);

  const { data: items = [], refetch: refetchHinanhyo } = useQuery<HinanhyoDR[]>({
    queryKey: ["hinanhyo", detail.id],
    queryFn: () => apiFetch(`/api/projects/${detail.id}/hinanhyo`).then((r) => r.json()),
  });

  const allSubFases = (detail.fases ?? []).flatMap((f) => (f.subFases ?? []).map((sf) => ({ ...sf, faseName: FASE_LABELS[f.fase] })));

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
                  <option key={sf.id} value={sf.id}>{sf.faseName} — {sf.name}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Title *</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Issue title..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
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

      {items.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No items yet</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
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
                <option key={sf.id} value={sf.id}>{sf.faseName} — {sf.name}</option>
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
  const [aktualMp, setAktualMp] = useState(String(detail.aktualMp ?? ""));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const res = await apiFetch(`/api/projects/${detail.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aktualMp: aktualMp || null }),
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
          <p className="text-2xl font-bold text-gray-900">{detail.kebutuhanMp} <span className="text-sm font-normal text-gray-500">persons</span></p>
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
            <button onClick={save} disabled={saving}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium disabled:opacity-50">
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              Save
            </button>
          </div>
        </div>
      </div>
      {detail.aktualMp && detail.aktualMp > detail.kebutuhanMp && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-700">
          ⚠ Actual MP exceeds required by {detail.aktualMp - detail.kebutuhanMp} person(s) ({Math.round(((detail.aktualMp - detail.kebutuhanMp) / detail.kebutuhanMp) * 100)}% over)
        </div>
      )}
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
