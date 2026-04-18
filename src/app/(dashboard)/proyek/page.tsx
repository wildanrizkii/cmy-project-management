"use client";
import { apiFetch } from "@/lib/fetch-client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search, Plus, Download, Trash2, Eye, ChevronUp, ChevronDown,
} from "lucide-react";
import {
  getStatusColor, getPriorityColor, getFaseColor, formatDate, computeProjectProgress,
} from "@/lib/utils";
import * as XLSX from "xlsx";
import {
  STATUS_LABELS, FASE_LABELS, PRIORITY_LABELS,
} from "@/types";
import type { Project, Priority, ProjectStatus, FaseType } from "@/types";
import { useToast } from "@/components/layout/toast-context";
import { useLanguage } from "@/contexts/language-context";
import { ProjectDetailModal } from "@/components/proyek/project-detail-modal";
import { CreateProjectModal } from "@/components/proyek/create-project-modal";

type SortKey = "assNumber" | "assName" | "customer" | "priority" | "status" | "targetDate";
type SortDir = "asc" | "desc";

export default function ProyekPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLanguage();
  const py = t.proyek;

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterFase, setFilterFase] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("assNumber");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedInitialTab, setSelectedInitialTab] = useState<string | undefined>(undefined);
  const [showCreate, setShowCreate] = useState(false);

  // Auto-open project from global search or external navigation
  useEffect(() => {
    const openId = sessionStorage.getItem("openProjectId");
    if (!openId) return;
    sessionStorage.removeItem("openProjectId");
    const openTab = sessionStorage.getItem("openProjectTab");
    if (openTab) { sessionStorage.removeItem("openProjectTab"); setSelectedInitialTab(openTab); }
    setSearch("");
    setPage(1);
    setPendingOpenId(openId);
  }, []);

  const [pendingOpenId, setPendingOpenId] = useState<string | null>(null);

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ["projects", { search, filterStatus, filterPriority, filterFase }],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterStatus) params.set("status", filterStatus);
      if (filterPriority) params.set("priority", filterPriority);
      if (filterFase) params.set("fase", filterFase);
      return apiFetch(`/api/projects?${params}`).then((r) => r.json());
    },
  });

  // Open modal for project coming from global search
  useEffect(() => {
    if (!pendingOpenId || projects.length === 0) return;
    const found = projects.find((p) => p.id === pendingOpenId);
    if (found) {
      setSelectedProject(found);
      setPendingOpenId(null);
    }
  }, [pendingOpenId, projects]);

  const deleteMutation = useMutation({
    mutationFn: (p: Project) =>
      apiFetch(`/api/projects/${p.id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: (_data, p) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast("success", `Project ${p.assNumber} deleted`);
    },
    onError: () => toast("error", "Failed to delete"),
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const sorted = [...projects].sort((a, b) => {
    let av: string | number = a[sortKey] as string | number;
    let bv: string | number = b[sortKey] as string | number;
    if (typeof av === "string") av = av.toLowerCase();
    if (typeof bv === "string") bv = bv.toLowerCase();
    return sortDir === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
  });

  const total = sorted.length;
  const paginated = sorted.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.ceil(total / perPage);

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (
      sortDir === "asc" ? <ChevronUp className="w-3 h-3 inline ml-1" /> : <ChevronDown className="w-3 h-3 inline ml-1" />
    ) : null;

  const handleExport = () => {
    const rows = sorted.map((p) => ({
      "Assy Number": p.assNumber,
      "Assy Name": p.assName,
      Model: p.model,
      Customer: p.customer,
      "Project Leader": p.projectLeader?.name ?? "-",
      Priority: PRIORITY_LABELS[p.priority],
      Status: STATUS_LABELS[p.status],
      Phase: FASE_LABELS[p.currentFase],
      Progress: `${computeProjectProgress(p.fases ?? [])}%`,
      "Start Date": formatDate(p.startDate),
      "Target Date": formatDate(p.targetDate),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Projects");
    XLSX.writeFile(wb, `projects-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleDelete = (p: Project) => {
    if (confirm(`${py.confirmDelete} "${p.assName}"? ${py.confirmDeleteMsg}`)) {
      deleteMutation.mutate(p);
    }
  };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} {py.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            {t.export}
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {py.addProject}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-52 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder={py.searchPlaceholder}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
          >
            <option value="">{py.allStatus}</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select
            value={filterPriority}
            onChange={(e) => { setFilterPriority(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
          >
            <option value="">{py.allPriority}</option>
            {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select
            value={filterFase}
            onChange={(e) => { setFilterFase(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
          >
            <option value="">{py.allPhase}</option>
            {Object.entries(FASE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          {(search || filterStatus || filterPriority || filterFase) && (
            <button
              onClick={() => { setSearch(""); setFilterStatus(""); setFilterPriority(""); setFilterFase(""); setPage(1); }}
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {t.reset}
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-blue-600 text-white">
                {[
                  { key: "assNumber", label: py.colAssyNo },
                  { key: "assName", label: py.colAssyName },
                  { key: "customer", label: py.colCustomer },
                  { key: null, label: py.colLeader },
                  { key: "priority", label: py.colPriority },
                  { key: "status", label: py.colStatus },
                  { key: null, label: py.colPhase },
                  { key: null, label: py.colProgress },
                  { key: "targetDate", label: py.colTargetDate },
                  { key: null, label: py.colActions },
                ].map(({ key, label }) => (
                  <th
                    key={label}
                    className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap ${key ? "cursor-pointer select-none hover:bg-blue-700" : ""}`}
                    onClick={() => key && handleSort(key as SortKey)}
                  >
                    <div className="flex items-center gap-1">
                      {label}
                      {key && <SortIcon k={key as SortKey} />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-20 text-center">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-sm text-gray-400">Loading...</p>
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-20 text-center">
                    <p className="text-sm font-medium text-gray-400">{py.noProjects}</p>
                  </td>
                </tr>
              ) : (
                paginated.map((p) => {
                  const progress = computeProjectProgress(p.fases ?? []);
                  return (
                    <tr key={p.id} className="hover:bg-blue-50/20 transition-colors">
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          {p.assNumber}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => setSelectedProject(p)}
                          className="font-semibold text-gray-900 hover:text-blue-600 text-left leading-snug transition-colors"
                        >
                          {p.assName}
                        </button>
                        <div className="text-xs text-gray-400 mt-0.5">{p.model}</div>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-gray-600 whitespace-nowrap">{p.customer}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-600 whitespace-nowrap">{p.projectLeader?.name ?? "—"}</td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(p.priority)}`}>
                          {PRIORITY_LABELS[p.priority]}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(p.status)}`}>
                          {STATUS_LABELS[p.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${getFaseColor(p.currentFase)}`}>
                          {FASE_LABELS[p.currentFase]}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 min-w-32">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full">
                            <div
                              className={`h-2 rounded-full transition-all ${progress >= 100 ? "bg-green-500" : progress >= 50 ? "bg-blue-500" : "bg-orange-400"}`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-gray-600 w-9 text-right">{progress}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-gray-600 whitespace-nowrap">{formatDate(p.targetDate)}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() => setSelectedProject(p)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title={py.viewDetail}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(p)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title={py.deleteTitle}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>{py.show}</span>
              <select
                value={perPage}
                onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
                className="border border-gray-200 rounded px-2 py-1 text-sm"
              >
                {[10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <span>{py.ofProjects} {total} {py.projectsSuffix}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                &laquo;
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                .map((n, idx, arr) => (
                  <>
                    {idx > 0 && arr[idx - 1] !== n - 1 && (
                      <span key={`dots-${n}`} className="px-2 text-gray-400">…</span>
                    )}
                    <button
                      key={n}
                      onClick={() => setPage(n)}
                      className={`px-3 py-1.5 text-sm border rounded transition-colors ${page === n ? "bg-blue-600 text-white border-blue-600" : "border-gray-200 hover:bg-gray-50"}`}
                    >
                      {n}
                    </button>
                  </>
                ))}
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                &raquo;
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Project Detail Modal */}
      {selectedProject && (
        <ProjectDetailModal
          project={selectedProject}
          initialTab={selectedInitialTab as "info" | "phases" | "hinanhyo" | "mp" | "ct" | "schedule" | "activity" | undefined}
          onClose={() => { setSelectedProject(null); setSelectedInitialTab(undefined); }}
          onUpdate={(updated) => {
            setSelectedProject(updated);
            queryClient.invalidateQueries({ queryKey: ["projects"] });
          }}
        />
      )}

      {/* Create Project Modal */}
      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreate={() => {
            setShowCreate(false);
            queryClient.invalidateQueries({ queryKey: ["projects"] });
          }}
        />
      )}
    </div>
  );
}
