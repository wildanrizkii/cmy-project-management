"use client";
import { apiFetch } from "@/lib/fetch-client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X, Plus, Save, Loader2, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { useToast } from "@/components/layout/toast-context";
import { useSession } from "next-auth/react";
import {
  formatDate,
  formatDateTime,
  getStatusColor,
  getPriorityColor,
  getFaseColor,
  getHinanhyoStatusColor,
} from "@/lib/utils";
import {
  STATUS_LABELS,
  FASE_LABELS,
  PRIORITY_LABELS,
  HINANHYO_STATUS_LABELS,
  HINANHYO_TYPE_LABELS,
  DEPARTMENT_LABELS,
} from "@/types";
import type { Project, HinanhyoDR, ActivityLog, Department, User } from "@/types";

interface Props {
  project: Project;
  onClose: () => void;
  onUpdate: (p: Project) => void;
}

type Tab = "info" | "progress" | "hinanhyo" | "mp" | "aktivitas";

export function ProjectDetailModal({ project, onClose, onUpdate }: Props) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("info");

  const handleExport = async () => {
    const [detailRes, hinanhyoRes, activityRes] = await Promise.all([
      apiFetch(`/api/projects/${project.id}`).then((r) => r.json()),
      apiFetch(`/api/projects/${project.id}/hinanhyo`).then((r) => r.json()),
      apiFetch(`/api/projects/${project.id}/activity`).then((r) => r.json()),
    ]);
    const d = detailRes as Project;
    const wb = XLSX.utils.book_new();

    // Sheet 1: Info Umum
    const info = [
      ["Kode Proyek", d.code],
      ["Nama Proyek", d.name],
      ["Customer", d.customer],
      ["PIC", d.pic?.name ?? "-"],
      ["Department", d.pic?.department ?? "-"],
      ["Prioritas", PRIORITY_LABELS[d.priority]],
      ["Status", STATUS_LABELS[d.status]],
      ["Fase Saat Ini", FASE_LABELS[d.currentFase]],
      ["Tanggal Mulai", formatDate(d.startDate)],
      ["Deadline", formatDate(d.endDate)],
      ["Deskripsi", d.description ?? "-"],
    ];
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(info),
      "Info Umum",
    );

    // Sheet 2: Progress
    const progress = [
      ["Fase", "Progress (%)"],
      ["RFQ", d.rfqProgress],
      ["Die Go", d.dieGoProgress],
      ["Event Project", d.eventProjectProgress],
      ["Mass Pro", d.massProProgress],
      ["Overall", Math.round(d.overallProgress)],
    ];
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(progress),
      "Progress",
    );

    // Sheet 3: MP & Cycle Time
    const mp = [
      ["Item", "Nilai"],
      ["Kebutuhan MP (orang)", d.kebutuhanMp],
      ["Aktual MP (orang)", d.aktualMp ?? "-"],
      ["Cycle Time Target (hari)", d.cycleTimeTarget],
      ["Cycle Time Aktual (hari)", d.cycleTimeAktual ?? "-"],
    ];
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(mp),
      "MP & Cycle Time",
    );

    // Sheet 4: Hinanhyo & DR
    if (hinanhyoRes.length > 0) {
      const rows = (hinanhyoRes as HinanhyoDR[]).map((h) => ({
        Tipe: HINANHYO_TYPE_LABELS[h.type],
        Judul: h.title,
        Deskripsi: h.description ?? "-",
        Status: HINANHYO_STATUS_LABELS[h.status],
        Dibuat: formatDate(h.createdAt),
      }));
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(rows),
        "Hinanhyo & DR",
      );
    }

    // Sheet 5: Aktivitas
    if (activityRes.length > 0) {
      const rows = (activityRes as ActivityLog[]).map((a) => ({
        Tanggal: formatDate(a.createdAt),
        User:
          (a as ActivityLog & { user?: { name: string } }).user?.name ?? "-",
        Aksi: a.action,
        Detail: a.detail ?? "-",
      }));
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(rows),
        "Riwayat Aktivitas",
      );
    }

    XLSX.writeFile(wb, `${d.code}-${d.name.replace(/\s+/g, "-")}.xlsx`);
  };

  const isAtasan = session?.user?.role === "ATASAN";
  const isPIC = project.picId === session?.user?.id;
  const canEdit = isAtasan || isPIC;

  // Fetch full project detail
  const { data: detail } = useQuery<Project>({
    queryKey: ["project", project.id],
    queryFn: () => apiFetch(`/api/projects/${project.id}`).then((r) => r.json()),
    initialData: project,
  });

  const tabs: { id: Tab; label: string }[] = [
    { id: "info", label: "Informasi Umum" },
    { id: "progress", label: "Progress & Fase" },
    { id: "hinanhyo", label: "Hinanhyo & DR" },
    { id: "mp", label: "MP & Cycle Time" },
    { id: "aktivitas", label: "Riwayat Aktivitas" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="font-mono text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                {detail?.code}
              </span>
              <span
                className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(detail?.status ?? "BELUM_MULAI")}`}
              >
                {STATUS_LABELS[detail?.status ?? "BELUM_MULAI"]}
              </span>
              <span
                className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(detail?.priority ?? "MEDIUM")}`}
              >
                {PRIORITY_LABELS[detail?.priority ?? "MEDIUM"]}
              </span>
            </div>
            <h2 className="text-lg font-bold text-gray-900">{detail?.name}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors"
              title="Export ke Excel"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6 overflow-x-auto shrink-0">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                tab === t.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === "info" && (
            <InfoTab
              detail={detail}
              canEdit={canEdit}
              isAtasan={isAtasan}
              onUpdate={onUpdate}
              toast={toast}
            />
          )}
          {tab === "progress" && (
            <ProgressTab
              detail={detail}
              canEdit={canEdit}
              onUpdate={onUpdate}
              toast={toast}
            />
          )}
          {tab === "hinanhyo" && (
            <HinanhyoTab projectId={project.id} canEdit={canEdit} toast={toast} />
          )}
          {tab === "mp" && (
            <MPTab detail={detail} canEdit={canEdit} onUpdate={onUpdate} toast={toast} />
          )}
          {tab === "aktivitas" && <AktivitasTab projectId={project.id} />}
        </div>
      </div>
    </div>
  );
}

// ─── Tab 1: Info ─────────────────────────────────────────────────────────────
function InfoTab({
  detail,
  canEdit,
  isAtasan,
  onUpdate,
  toast,
}: {
  detail: Project | undefined;
  canEdit: boolean;
  isAtasan: boolean;
  onUpdate: (p: Project) => void;
  toast: (type: "success" | "error", message: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [showTundaConfirm, setShowTundaConfirm] = useState(false);
  const [form, setForm] = useState({
    name: detail?.name ?? "",
    customer: detail?.customer ?? "",
    picId: detail?.picId ?? "",
    priority: detail?.priority ?? "MEDIUM",
    startDate: detail?.startDate ? detail.startDate.slice(0, 10) : "",
    endDate: detail?.endDate ? detail.endDate.slice(0, 10) : "",
    kebutuhanMp: String(detail?.kebutuhanMp ?? ""),
    cycleTimeTarget: String(detail?.cycleTimeTarget ?? ""),
    description: detail?.description ?? "",
    status: detail?.status ?? "BELUM_MULAI",
  });
  const [saving, setSaving] = useState(false);

  const { data: bawahanList = [] } = useQuery<User[]>({
    queryKey: ["users", "BAWAHAN"],
    queryFn: () => apiFetch("/api/users?role=BAWAHAN").then((r) => r.json()),
    enabled: editing && isAtasan,
  });

  const handleSave = async () => {
    setSaving(true);
    const payload: Record<string, unknown> = { description: form.description, status: form.status };
    if (isAtasan) {
      payload.name = form.name;
      payload.customer = form.customer;
      payload.picId = form.picId;
      payload.priority = form.priority;
      payload.startDate = form.startDate;
      payload.endDate = form.endDate;
      payload.kebutuhanMp = parseInt(form.kebutuhanMp);
      payload.cycleTimeTarget = parseInt(form.cycleTimeTarget);
    }
    const res = await apiFetch(`/api/projects/${detail?.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const updated = await res.json();
    setSaving(false);
    if (!res.ok) {
      toast("error", updated.error ?? "Gagal menyimpan perubahan");
      return;
    }
    onUpdate(updated);
    setEditing(false);
    toast("success", "Informasi proyek berhasil disimpan");
  };

  const handleTunda = async () => {
    const res = await apiFetch(`/api/projects/${detail?.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "TUNDA" }),
    });
    const updated = await res.json();
    setShowTundaConfirm(false);
    if (!res.ok) {
      toast("error", updated.error ?? "Gagal menunda proyek");
      return;
    }
    onUpdate(updated);
    toast("success", "Proyek ditandai sebagai Tunda");
  };

  if (!detail) return null;

  return (
    <div className="space-y-5">
      {/* Action buttons */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {canEdit && !editing && (
            <button
              onClick={() => {
                setForm({
                  name: detail.name,
                  customer: detail.customer,
                  picId: detail.picId,
                  priority: detail.priority,
                  startDate: detail.startDate.slice(0, 10),
                  endDate: detail.endDate.slice(0, 10),
                  kebutuhanMp: String(detail.kebutuhanMp),
                  cycleTimeTarget: String(detail.cycleTimeTarget),
                  description: detail.description ?? "",
                  status: detail.status,
                });
                setEditing(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 border border-blue-200 hover:bg-blue-50 rounded-lg transition-colors"
            >
              Edit Proyek
            </button>
          )}
        </div>
        {isAtasan && !editing && detail.status !== "TUNDA" && detail.status !== "SELESAI" && (
          <button
            onClick={() => setShowTundaConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-orange-600 border border-orange-200 hover:bg-orange-50 rounded-lg transition-colors"
          >
            Tunda Proyek
          </button>
        )}
        {isAtasan && !editing && detail.status === "TUNDA" && (
          <button
            onClick={() => {
              setForm({ ...form, status: "DALAM_PROSES" });
              setEditing(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 border border-blue-200 hover:bg-blue-50 rounded-lg transition-colors"
          >
            Aktifkan Kembali
          </button>
        )}
      </div>

      {/* Read-only view */}
      {!editing && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nama Proyek" value={detail.name} />
          <Field label="Customer" value={detail.customer} />
          <Field
            label="PIC"
            value={`${detail.pic?.name} (${DEPARTMENT_LABELS[detail.pic?.department as Department] ?? "-"})`}
          />
          <Field
            label="Prioritas"
            value={
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(detail.priority)}`}>
                {PRIORITY_LABELS[detail.priority]}
              </span>
            }
          />
          <Field label="Tanggal Mulai" value={formatDate(detail.startDate)} />
          <Field label="Tanggal Berakhir" value={formatDate(detail.endDate)} />
          <Field label="Kebutuhan MP" value={`${detail.kebutuhanMp} orang`} />
          <Field label="Cycle Time Target" value={`${detail.cycleTimeTarget} hari kerja`} />
          <Field
            label="Fase Aktif"
            value={
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getFaseColor(detail.currentFase)}`}>
                {FASE_LABELS[detail.currentFase]}
              </span>
            }
          />
          <Field
            label="Progress Keseluruhan"
            value={
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-200 rounded-full">
                  <div className="h-2 bg-blue-500 rounded-full" style={{ width: `${detail.overallProgress}%` }} />
                </div>
                <span className="text-sm font-bold text-blue-600">{Math.round(detail.overallProgress)}%</span>
              </div>
            }
          />
        </div>
      )}

      {/* Description (read-only) */}
      {!editing && (
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Deskripsi</label>
          <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-lg p-3">
            {detail.description ?? "Tidak ada deskripsi"}
          </p>
        </div>
      )}

      {/* Edit form */}
      {editing && (
        <div className="space-y-4 border border-blue-100 bg-blue-50/30 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-800">Edit Informasi Proyek</h3>

          {isAtasan && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Nama Proyek *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Customer *</label>
                <input
                  value={form.customer}
                  onChange={(e) => setForm({ ...form, customer: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">PIC *</label>
                <select
                  value={form.picId}
                  onChange={(e) => setForm({ ...form, picId: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={detail.picId}>{detail.pic?.name}</option>
                  {bawahanList.filter((u) => u.id !== detail.picId).map((u) => (
                    <option key={u.id} value={u.id}>{u.name} — {DEPARTMENT_LABELS[u.department as Department] ?? u.department}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Prioritas</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value as typeof form.priority })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Tanggal Mulai *</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Tanggal Berakhir *</label>
                <input
                  type="date"
                  min={form.startDate}
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Kebutuhan MP (orang) *</label>
                <input
                  type="number"
                  min="1"
                  value={form.kebutuhanMp}
                  onChange={(e) => setForm({ ...form, kebutuhanMp: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Cycle Time Target (hari kerja) *</label>
                <input
                  type="number"
                  min="1"
                  value={form.cycleTimeTarget}
                  onChange={(e) => setForm({ ...form, cycleTimeTarget: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Deskripsi</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-20"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as typeof form.status })}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              Simpan
            </button>
            <button
              onClick={() => setEditing(false)}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Hinanhyo count */}
      {(detail._count?.hinanhyoDRs ?? 0) > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-800">
          Total {detail._count?.hinanhyoDRs} item Hinanhyo & DR — lihat tab Hinanhyo & DR.
        </div>
      )}

      {/* Tunda confirmation */}
      {showTundaConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowTundaConfirm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-base font-bold text-gray-900 mb-2">Tunda proyek ini?</h3>
            <p className="text-sm text-gray-500 mb-5">
              Proyek <span className="font-medium text-gray-800">{detail.name}</span> akan ditandai sebagai <span className="font-semibold text-orange-600">Tunda</span>. Anda bisa mengaktifkannya kembali kapan saja.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleTunda}
                className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Ya, Tunda
              </button>
              <button
                onClick={() => setShowTundaConfirm(false)}
                className="flex-1 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-lg text-sm font-medium transition-colors"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab 2: Progress ──────────────────────────────────────────────────────────
function ProgressTab({
  detail,
  canEdit,
  onUpdate,
  toast,
}: {
  detail: Project | undefined;
  canEdit: boolean;
  onUpdate: (p: Project) => void;
  toast: (type: "success" | "error", message: string) => void;
}) {
  const [rfq, setRfq] = useState(detail?.rfqProgress ?? 0);
  const [dieGo, setDieGo] = useState(detail?.dieGoProgress ?? 0);
  const [event, setEvent] = useState(detail?.eventProjectProgress ?? 0);
  const [massPro, setMassPro] = useState(detail?.massProProgress ?? 0);
  const [saving, setSaving] = useState(false);

  if (!detail) return null;

  const overall = Math.round((rfq + dieGo + event + massPro) / 4);

  const handleSave = async () => {
    setSaving(true);
    const res = await apiFetch(`/api/projects/${detail.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rfqProgress: rfq,
        dieGoProgress: dieGo,
        eventProjectProgress: event,
        massProProgress: massPro,
      }),
    });
    const updated = await res.json();
    setSaving(false);
    if (!res.ok) {
      toast("error", updated.error ?? "Gagal menyimpan progress");
      return;
    }
    onUpdate(updated);
    toast("success", "Progress proyek berhasil disimpan");
  };

  const phases = [
    { label: "RFQ", value: rfq, set: setRfq, locked: false },
    { label: "Die Go", value: dieGo, set: setDieGo, locked: rfq < 100 },
    {
      label: "Event Project",
      value: event,
      set: setEvent,
      locked: dieGo < 100,
    },
    { label: "Mass Pro", value: massPro, set: setMassPro, locked: event < 100 },
  ];

  return (
    <div className="space-y-6">
      {/* Overall */}
      <div className="bg-blue-50 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-blue-900">
            Progress Keseluruhan
          </span>
          <span className="text-2xl font-bold text-blue-600">{overall}%</span>
        </div>
        <div className="h-3 bg-blue-200 rounded-full">
          <div
            className="h-3 bg-blue-600 rounded-full transition-all"
            style={{ width: `${overall}%` }}
          />
        </div>
      </div>

      {/* Phase Bars */}
      <div className="space-y-4">
        {phases.map(({ label, value, set, locked }) => (
          <div key={label} className={locked ? "opacity-50" : ""}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium text-gray-700">{label}</span>
              <div className="flex items-center gap-2">
                {locked && (
                  <span className="text-xs text-gray-400 italic">
                    Terkunci — fase sebelumnya belum 100%
                  </span>
                )}
                <span className="text-sm font-bold text-gray-700">
                  {value}%
                </span>
              </div>
            </div>
            <div className="relative">
              <div className="h-3 bg-gray-200 rounded-full">
                <div
                  className="h-3 bg-green-500 rounded-full transition-all"
                  style={{ width: `${value}%` }}
                />
              </div>
              {canEdit && !locked && (
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={value}
                  onChange={(e) => set(Number(e.target.value))}
                  className="absolute inset-0 w-full opacity-0 cursor-pointer h-3"
                />
              )}
            </div>
            {canEdit && !locked && (
              <input
                type="number"
                min="0"
                max="100"
                value={value}
                onChange={(e) =>
                  set(Math.min(100, Math.max(0, Number(e.target.value))))
                }
                className="mt-1.5 w-20 border border-gray-200 rounded px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            )}
          </div>
        ))}
      </div>

      {canEdit && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Simpan Progress
        </button>
      )}
    </div>
  );
}

// ─── Tab 3: Hinanhyo & DR ─────────────────────────────────────────────────────
function HinanhyoTab({
  projectId,
  canEdit,
  toast,
}: {
  projectId: string;
  canEdit: boolean;
  toast: (type: "success" | "error", message: string) => void;
}) {
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    type: "HINANHYO",
    title: "",
    description: "",
    status: "PENDING",
  });
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery<HinanhyoDR[]>({
    queryKey: ["hinanhyo", projectId],
    queryFn: () =>
      apiFetch(`/api/projects/${projectId}/hinanhyo`).then((r) => r.json()),
  });

  const filtered = items.filter((item) => {
    if (filterType && item.type !== filterType) return false;
    if (filterStatus && item.status !== filterStatus) return false;
    return true;
  });

  const handleAdd = async () => {
    if (!form.title) return;
    setSaving(true);
    const res = await apiFetch(`/api/projects/${projectId}/hinanhyo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) {
      toast("error", "Gagal menambahkan item");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["hinanhyo", projectId] });
    setForm({ type: "HINANHYO", title: "", description: "", status: "PENDING" });
    setShowAdd(false);
    toast("success", "Item berhasil ditambahkan");
  };

  const handleStatusChange = async (id: string, status: string) => {
    const res = await apiFetch(`/api/hinanhyo/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      toast("error", "Gagal mengubah status");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["hinanhyo", projectId] });
    toast("success", `Status diperbarui ke ${HINANHYO_STATUS_LABELS[status as keyof typeof HINANHYO_STATUS_LABELS]}`);
  };

  return (
    <div className="space-y-4">
      {/* Filters + Add */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
          >
            <option value="">Semua Jenis</option>
            <option value="HINANHYO">Hinanhyo</option>
            <option value="DR">Design Review</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
          >
            <option value="">Semua Status</option>
            {Object.entries(HINANHYO_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Tambah
          </button>
        )}
      </div>

      {/* Add Form */}
      {showAdd && (
        <div className="border border-blue-200 bg-blue-50 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-blue-900">
            Tambah Hinanhyo / DR
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                Jenis
              </label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="HINANHYO">Hinanhyo</option>
                <option value="DR">Design Review</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                Status Awal
              </label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                {Object.entries(HINANHYO_STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">
              Judul *
            </label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Judul temuan..."
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">
              Deskripsi
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-16"
              placeholder="Deskripsi detail..."
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={saving || !form.title}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50 hover:bg-blue-700"
            >
              {saving ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Save className="w-3 h-3" />
              )}
              Simpan
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-white"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="py-8 text-center text-gray-400 text-sm">Memuat...</div>
      ) : filtered.length === 0 ? (
        <div className="py-8 text-center text-gray-400 text-sm">
          Tidak ada data Hinanhyo & DR
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["Jenis", "Judul", "Deskripsi", "Status", "PIC", "Dibuat"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${item.type === "HINANHYO" ? "bg-purple-100 text-purple-700" : "bg-cyan-100 text-cyan-700"}`}
                    >
                      {HINANHYO_TYPE_LABELS[item.type]}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-medium text-gray-900">
                    {item.title}
                  </td>
                  <td className="px-3 py-3 text-gray-500 max-w-48 truncate">
                    {item.description ?? "-"}
                  </td>
                  <td className="px-3 py-3">
                    {canEdit ? (
                      <select
                        value={item.status}
                        onChange={(e) =>
                          handleStatusChange(item.id, e.target.value)
                        }
                        className={`text-xs rounded px-2 py-1 border font-medium ${getHinanhyoStatusColor(item.status)}`}
                      >
                        {Object.entries(HINANHYO_STATUS_LABELS).map(
                          ([k, v]) => (
                            <option key={k} value={k}>
                              {v}
                            </option>
                          ),
                        )}
                      </select>
                    ) : (
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${getHinanhyoStatusColor(item.status)}`}
                      >
                        {HINANHYO_STATUS_LABELS[item.status]}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {item.pic?.name ?? "-"}
                  </td>
                  <td className="px-3 py-3 text-gray-500 whitespace-nowrap">
                    {formatDate(item.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Tab 4: MP & Cycle Time ───────────────────────────────────────────────────
function MPTab({
  detail,
  canEdit,
  onUpdate,
  toast,
}: {
  detail: Project | undefined;
  canEdit: boolean;
  onUpdate: (p: Project) => void;
  toast: (type: "success" | "error", message: string) => void;
}) {
  const [aktualMp, setAktualMp] = useState(detail?.aktualMp ?? 0);
  const [cycleTimeAktual, setCycleTimeAktual] = useState(
    detail?.cycleTimeAktual ?? 0,
  );
  const [saving, setSaving] = useState(false);

  if (!detail) return null;

  const eff = detail.cycleTimeAktual
    ? ((detail.cycleTimeTarget / detail.cycleTimeAktual) * 100).toFixed(1) + "%"
    : "-";

  const handleSave = async () => {
    setSaving(true);
    const res = await apiFetch(`/api/projects/${detail.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        aktualMp,
        cycleTimeAktual: cycleTimeAktual || null,
      }),
    });
    const updated = await res.json();
    setSaving(false);
    if (!res.ok) {
      toast("error", updated.error ?? "Gagal menyimpan data MP");
      return;
    }
    onUpdate(updated);
    toast("success", "Data MP & Cycle Time berhasil disimpan");
  };

  return (
    <div className="space-y-6">
      {/* Man Power */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-3">
          Data Man Power (MP)
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-500 font-medium mb-1">
              Kebutuhan MP (Rencana)
            </p>
            <p className="text-3xl font-bold text-gray-900">
              {detail.kebutuhanMp}
            </p>
            <p className="text-xs text-gray-400">orang</p>
          </div>
          <div
            className={`rounded-xl p-4 ${(detail.aktualMp ?? 0) > detail.kebutuhanMp ? "bg-red-50" : "bg-green-50"}`}
          >
            <p className="text-xs text-gray-500 font-medium mb-1">
              Aktual MP (Realisasi)
            </p>
            {canEdit ? (
              <input
                type="number"
                min="0"
                value={aktualMp}
                onChange={(e) => setAktualMp(Number(e.target.value))}
                className="text-3xl font-bold text-gray-900 bg-transparent w-20 focus:outline-none border-b border-gray-300"
              />
            ) : (
              <p className="text-3xl font-bold text-gray-900">
                {detail.aktualMp ?? "-"}
              </p>
            )}
            <p className="text-xs text-gray-400">orang</p>
          </div>
        </div>
        {detail.aktualMp && detail.aktualMp > detail.kebutuhanMp && (
          <p className="text-xs text-red-600 mt-2">
            ⚠ Kelebihan {detail.aktualMp - detail.kebutuhanMp} orang dari
            rencana (
            {Math.round(
              ((detail.aktualMp - detail.kebutuhanMp) / detail.kebutuhanMp) *
                100,
            )}
            %)
          </p>
        )}
      </div>

      {/* Cycle Time */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Cycle Time</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-500 font-medium mb-1">Target</p>
            <p className="text-2xl font-bold text-gray-900">
              {detail.cycleTimeTarget}
            </p>
            <p className="text-xs text-gray-400">hari kerja</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-500 font-medium mb-1">Aktual</p>
            {canEdit ? (
              <input
                type="number"
                min="0"
                value={cycleTimeAktual}
                onChange={(e) => setCycleTimeAktual(Number(e.target.value))}
                className="text-2xl font-bold text-gray-900 bg-transparent w-20 focus:outline-none border-b border-gray-300"
                placeholder="0"
              />
            ) : (
              <p className="text-2xl font-bold text-gray-900">
                {detail.cycleTimeAktual ?? "-"}
              </p>
            )}
            <p className="text-xs text-gray-400">hari kerja</p>
          </div>
          <div
            className={`rounded-xl p-4 ${detail.cycleTimeAktual && detail.cycleTimeAktual > detail.cycleTimeTarget ? "bg-red-50" : "bg-green-50"}`}
          >
            <p className="text-xs text-gray-500 font-medium mb-1">Efisiensi</p>
            <p className="text-2xl font-bold text-gray-900">{eff}</p>
            <p className="text-xs text-gray-400">
              {detail.cycleTimeAktual
                ? detail.cycleTimeAktual <= detail.cycleTimeTarget
                  ? "✓ Tepat/Lebih Cepat"
                  : "⚠ Molor"
                : "Dalam Proses"}
            </p>
          </div>
        </div>
      </div>

      {canEdit && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Simpan
        </button>
      )}
    </div>
  );
}

// ─── Tab 5: Activity Log ──────────────────────────────────────────────────────
function AktivitasTab({ projectId }: { projectId: string }) {
  const { data: logs = [], isLoading } = useQuery<ActivityLog[]>({
    queryKey: ["activity", projectId],
    queryFn: () =>
      apiFetch(`/api/projects/${projectId}/activity`).then((r) => r.json()),
  });

  return (
    <div>
      {isLoading ? (
        <div className="py-8 text-center text-gray-400 text-sm">Memuat...</div>
      ) : logs.length === 0 ? (
        <div className="py-8 text-center text-gray-400 text-sm">
          Belum ada aktivitas
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />
          <div className="space-y-4 pl-10">
            {logs.map((log) => (
              <div key={log.id} className="relative">
                <div className="absolute -left-6 w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow" />
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                      {log.action}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatDateTime(log.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{log.detail}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    oleh {log.user?.name ?? "-"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helper ───────────────────────────────────────────────────────────────────
function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
        {label}
      </p>
      <div className="text-sm text-gray-900">{value}</div>
    </div>
  );
}
