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
import { ProjectDetailModal } from "@/components/proyek/project-detail-modal";
import { CreateProjectModal } from "@/components/proyek/create-project-modal";

type SortKey = "assNumber" | "assName" | "customer" | "priority" | "status" | "targetDate";
type SortDir = "asc" | "desc";

export default function ProyekPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterFase, setFilterFase] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("assNumber");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // Auto-open project from global search
  useEffect(() => {
    const openId = sessionStorage.getItem("openProjectId");
    if (!openId) return;
    sessionStorage.removeItem("openProjectId");
    // We'll find the project once data loads — handled below
    setSearch("");
    setPage(1);
    // Store id so we can open modal after data loads
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
    onError: () => toast("error", "Failed to delete project"),
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
    if (confirm(`Delete project "${p.assName}"? This action cannot be undone.`)) {
      deleteMutation.mutate(p);
    }
  };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} project(s) found</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            Export Excel
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Project
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
              placeholder="Search name, customer, assy number..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
          >
            <option value="">All Status</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select
            value={filterPriority}
            onChange={(e) => { setFilterPriority(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
          >
            <option value="">All Priority</option>
            {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select
            value={filterFase}
            onChange={(e) => { setFilterFase(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
          >
            <option value="">All Phase</option>
            {Object.entries(FASE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          {(search || filterStatus || filterPriority || filterFase) && (
            <button
              onClick={() => { setSearch(""); setFilterStatus(""); setFilterPriority(""); setFilterFase(""); setPage(1); }}
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {[
                  { key: "assNumber", label: "Assy No." },
                  { key: "assName", label: "Assy Name" },
                  { key: "customer", label: "Customer" },
                  { key: null, label: "Project Leader" },
                  { key: "priority", label: "Priority" },
                  { key: "status", label: "Status" },
                  { key: null, label: "Phase" },
                  { key: null, label: "Progress" },
                  { key: "targetDate", label: "Target Date" },
                  { key: null, label: "Actions" },
                ].map(({ key, label }) => (
                  <th
                    key={label}
                    className={`px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap ${key ? "cursor-pointer select-none hover:text-gray-700" : ""}`}
                    onClick={() => key && handleSort(key as SortKey)}
                  >
                    {label}
                    {key && <SortIcon k={key as SortKey} />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-gray-400">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-gray-400">No projects found</td>
                </tr>
              ) : (
                paginated.map((p) => {
                  const progress = computeProjectProgress(p.fases ?? []);
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono font-medium text-gray-600 text-xs">{p.assNumber}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelectedProject(p)}
                          className="font-medium text-blue-600 hover:text-blue-800 hover:underline text-left"
                        >
                          {p.assName}
                        </button>
                        <div className="text-xs text-gray-400 mt-0.5">{p.model}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{p.customer}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{p.projectLeader?.name ?? "-"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(p.priority)}`}>
                          {PRIORITY_LABELS[p.priority]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(p.status)}`}>
                          {STATUS_LABELS[p.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getFaseColor(p.currentFase)}`}>
                          {FASE_LABELS[p.currentFase]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-200 rounded-full w-16">
                            <div
                              className="h-1.5 bg-blue-500 rounded-full"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600 font-medium w-8">{progress}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(p.targetDate)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setSelectedProject(p)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="View detail"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(p)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete project"
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
              <span>Show</span>
              <select
                value={perPage}
                onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
                className="border border-gray-200 rounded px-2 py-1 text-sm"
              >
                {[10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <span>of {total} projects</span>
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
          onClose={() => setSelectedProject(null)}
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
