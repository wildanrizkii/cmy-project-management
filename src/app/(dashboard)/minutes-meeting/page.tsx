"use client";
import { apiFetch } from "@/lib/fetch-client";

import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Edit2, Save, Loader2, X, Search, FileText, CheckSquare, Square, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { DEPARTMENT_LABELS } from "@/types";
import { useToast } from "@/components/layout/toast-context";
import { useLanguage } from "@/contexts/language-context";
import type { Project } from "@/types";

type MinuteMeeting = {
  id: string;
  recordingDate: string;
  projectId: string | null;
  informasiUntuk: string | null;
  departemen: string | null;
  deskripsi: string;
  followUpDate: string | null;
  isDone: boolean;
  createdAt: string;
  project: { id: string; assNumber: string; assName: string; customer: string } | null;
  createdBy: { id: string; name: string };
};

const DEPT_OPTIONS = Object.entries(DEPARTMENT_LABELS).map(([value, label]) => ({ value, label }));

const emptyForm = {
  recordingDate: new Date().toISOString().slice(0, 10),
  projectId: "",
  informasiUntuk: "",
  departemen: "",
  deskripsi: "",
  followUpDate: "",
};

export default function MinutesMeetingPage() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const mm = t.mm;
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [filterDone, setFilterDone] = useState("");
  const [page, setPage] = useState(1);
  const PER_PAGE = 15;
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const { data: items = [], isLoading } = useQuery<MinuteMeeting[]>({
    queryKey: ["minutes-meeting", filterProject],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filterProject) params.set("projectId", filterProject);
      return apiFetch(`/api/minutes-meeting?${params}`).then((r) => r.json());
    },
    staleTime: 20000,
    refetchOnWindowFocus: false,
  });

  const { data: projects = [] } = useQuery<Pick<Project, "id" | "assNumber" | "assName">[]>({
    queryKey: ["projects-simple"],
    queryFn: () => apiFetch("/api/projects").then((r) => r.json()),
    staleTime: 60000,
    refetchOnWindowFocus: false,
    select: (data) => data.map((p) => ({ id: p.id, assNumber: p.assNumber, assName: p.assName })),
  });

  const filtered = useMemo(() => {
    let list = items;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (m) =>
          m.deskripsi.toLowerCase().includes(q) ||
          m.informasiUntuk?.toLowerCase().includes(q) ||
          m.project?.assNumber.toLowerCase().includes(q) ||
          m.project?.assName.toLowerCase().includes(q)
      );
    }
    if (filterDone !== "") list = list.filter((m) => m.isDone === (filterDone === "true"));
    return list;
  }, [items, search, filterDone]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const openAdd = () => { setEditingId(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (m: MinuteMeeting) => {
    setEditingId(m.id);
    setForm({
      recordingDate: m.recordingDate.slice(0, 10),
      projectId: m.projectId ?? "",
      informasiUntuk: m.informasiUntuk ?? "",
      departemen: m.departemen ?? "",
      deskripsi: m.deskripsi,
      followUpDate: m.followUpDate?.slice(0, 10) ?? "",
    });
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditingId(null); };

  const save = async () => {
    if (!form.recordingDate || !form.deskripsi) { toast("error", mm.toastValidation); return; }
    setSaving(true);
    try {
      const url = editingId ? `/api/minutes-meeting/${editingId}` : "/api/minutes-meeting";
      const method = editingId ? "PATCH" : "POST";
      const res = await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { toast("error", data.error ?? mm.toastError); return; }
      toast("success", editingId ? mm.toastUpdated : mm.toastAdded);
      queryClient.invalidateQueries({ queryKey: ["minutes-meeting"] });
      closeForm();
    } finally {
      setSaving(false);
    }
  };

  const toggleDone = async (m: MinuteMeeting) => {
    queryClient.setQueryData<MinuteMeeting[]>(["minutes-meeting", filterProject], (old) =>
      old?.map((item) => item.id === m.id ? { ...item, isDone: !item.isDone } : item) ?? []
    );
    const res = await apiFetch(`/api/minutes-meeting/${m.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDone: !m.isDone }),
    });
    if (!res.ok) {
      queryClient.invalidateQueries({ queryKey: ["minutes-meeting"] });
      toast("error", mm.toastStatusError);
    }
  };

  const del = async (id: string) => {
    if (!confirm(mm.confirmDelete)) return;
    queryClient.setQueryData<MinuteMeeting[]>(["minutes-meeting", filterProject], (old) =>
      old?.filter((item) => item.id !== id) ?? []
    );
    const res = await apiFetch(`/api/minutes-meeting/${id}`, { method: "DELETE" });
    if (!res.ok) {
      queryClient.invalidateQueries({ queryKey: ["minutes-meeting"] });
      toast("error", mm.toastDeleteError);
    } else {
      toast("success", mm.toastDeleted);
    }
  };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            {mm.title}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{mm.subtitle}</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> {mm.addNote}
        </button>
      </div>

      {/* Info banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 flex items-center gap-2">
        <span className="text-amber-500">⚠</span>
        {mm.banner}
        <a href="/sub-phases" className="font-semibold underline ml-1">{mm.bannerLink}</a>.
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={mm.searchPlaceholder}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterProject}
          onChange={(e) => setFilterProject(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
        >
          <option value="">{t.allProjects}</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.assNumber} - {p.assName}</option>
          ))}
        </select>
        <select
          value={filterDone}
          onChange={(e) => { setFilterDone(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
        >
          <option value="">{mm.allStatus}</option>
          <option value="false">{mm.pendingFollowUp}</option>
          <option value="true">{mm.completed}</option>
        </select>
        {(search || filterProject || filterDone !== "") && (
          <button
            onClick={() => { setSearch(""); setFilterProject(""); setFilterDone(""); setPage(1); }}
            className="flex items-center gap-1 px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <X className="w-3.5 h-3.5" /> {t.reset}
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-blue-600 text-white">
                {[mm.colDate, mm.colProject, mm.colInfoFor, mm.colDept, mm.colDesc, mm.colFollowUp, mm.colStatus, ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3 bg-gray-200 rounded animate-pulse" style={{ width: `${60 + j * 5}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-gray-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                    {mm.noData}
                  </td>
                </tr>
              ) : (
                paginated.map((m) => (
                  <tr key={m.id} className={`hover:bg-gray-50/50 transition-colors ${m.isDone ? "opacity-60" : ""}`}>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-700 font-medium">{formatDate(m.recordingDate)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {m.project ? (
                        <div>
                          <p className="font-mono text-xs text-gray-500">{m.project.assNumber}</p>
                          <p className="text-xs text-gray-700 truncate max-w-28">{m.project.assName}</p>
                        </div>
                      ) : <span className="text-gray-400 text-xs">-</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap max-w-32 truncate">{m.informasiUntuk ?? "-"}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {m.departemen ? (DEPARTMENT_LABELS[m.departemen as keyof typeof DEPARTMENT_LABELS] ?? m.departemen) : "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-700 max-w-64">
                      <p className={`text-sm leading-snug ${m.isDone ? "line-through text-gray-400" : ""}`}>{m.deskripsi}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">{m.followUpDate ? formatDate(m.followUpDate) : "-"}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleDone(m)} className="flex items-center gap-1.5 text-xs">
                        {m.isDone ? <CheckSquare className="w-4 h-4 text-green-500" /> : <Square className="w-4 h-4 text-gray-300" />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(m)} className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => del(m.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!isLoading && filtered.length > 0 && (
          <div className="px-4 py-2.5 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400">
              {filtered.length} {mm.countLabel} · {mm.pageLabel} {page} {mm.ofLabel} {totalPages}
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === "..." ? (
                      <span key={`e-${i}`} className="px-1.5 text-xs text-gray-400">…</span>
                    ) : (
                      <button key={p} onClick={() => setPage(p as number)}
                        className={`min-w-7 h-7 px-1.5 rounded-lg text-xs font-medium border transition-colors ${page === p ? "bg-blue-600 text-white border-blue-600" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                        {p}
                      </button>
                    )
                  )}
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                {editingId ? mm.editNote : mm.addNoteModalTitle}
              </h2>
              <button onClick={closeForm} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">{mm.formDate}</label>
                  <input type="date" value={form.recordingDate} onChange={(e) => setForm({ ...form, recordingDate: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">{mm.formFollowUp}</label>
                  <input type="date" value={form.followUpDate} onChange={(e) => setForm({ ...form, followUpDate: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">{mm.formProject}</label>
                  <select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700">
                    <option value="">{mm.formProjectOpt}</option>
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.assNumber} - {p.assName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">{mm.formDept}</label>
                  <select value={form.departemen} onChange={(e) => setForm({ ...form, departemen: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700">
                    <option value="">{mm.formDeptOpt}</option>
                    {DEPT_OPTIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">{mm.formInfoFor}</label>
                  <input value={form.informasiUntuk} onChange={(e) => setForm({ ...form, informasiUntuk: e.target.value })}
                    placeholder={mm.formInfoForPh}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">{mm.formDesc}</label>
                  <textarea value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
                    placeholder={mm.formDescPh} rows={4}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
              <button onClick={save} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? "..." : t.save}
              </button>
              <button onClick={closeForm} disabled={saving}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">
                {t.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
