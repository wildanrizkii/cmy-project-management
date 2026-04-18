"use client";
import { apiFetch } from "@/lib/fetch-client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Search, ListChecks, ChevronUp, ChevronDown, ChevronRight, Download, X, ExternalLink,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { FASE_LABELS, STATUS_LABELS } from "@/types";
import { useToast } from "@/components/layout/toast-context";
import { useLanguage } from "@/contexts/language-context";
import type { Project } from "@/types";
import * as XLSX from "xlsx";

type SubFaseRow = {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  isDone: boolean;
  picStartDate: string | null;
  picTargetDate: string | null;
  customerStartDate: string | null;
  customerTargetDate: string | null;
  documentUrl: string | null;
  createdAt: string;
  project: { id: string; assNumber: string; assName: string; customer: string } | null;
  projectFase: { id: string; fase: string };
  pic: { id: string; name: string };
  parentSubFase: { id: string; name: string } | null;
};

type SortKey = "project" | "fase" | "picTargetDate" | "name";
type SortDir = "asc" | "desc";
type TreeRow = SubFaseRow & { isChild: boolean; hasChildren: boolean; parentId?: string };

export default function TaskListPage() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const sp = t.sp;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [filterFase, setFilterFase] = useState("");
  const [filterDone, setFilterDone] = useState("false");
  const [filterProjectStatus, setFilterProjectStatus] = useState("");
  const [filterPic, setFilterPic] = useState("");
  const [parentOnly, setParentOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("picTargetDate");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [collapsedParents, setCollapsedParents] = useState<Set<string>>(new Set());

  const { data: items = [], isLoading } = useQuery<SubFaseRow[]>({
    queryKey: ["subfases-list", filterProject, filterFase, filterDone, filterProjectStatus, parentOnly],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filterProject) params.set("projectId", filterProject);
      if (filterFase) params.set("fase", filterFase);
      if (filterDone !== "") params.set("isDone", filterDone);
      if (filterProjectStatus) params.set("projectStatus", filterProjectStatus);
      if (parentOnly) params.set("parentOnly", "true");
      return apiFetch(`/api/subfases?${params}`).then((r) => r.json());
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

  const picOptions = useMemo(() => {
    const names = [...new Set(items.map((t) => t.pic?.name).filter(Boolean) as string[])];
    return names.sort();
  }, [items]);

  const sorted = useMemo(() => {
    let list = [...items];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.pic?.name.toLowerCase().includes(q) ||
          t.project?.assNumber.toLowerCase().includes(q) ||
          t.project?.assName.toLowerCase().includes(q)
      );
    }
    if (filterPic) list = list.filter((t) => t.pic?.name === filterPic);
    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "project") cmp = (a.project?.assNumber ?? "").localeCompare(b.project?.assNumber ?? "");
      else if (sortKey === "fase") cmp = a.projectFase.fase.localeCompare(b.projectFase.fase);
      else if (sortKey === "picTargetDate") cmp = (a.picTargetDate ?? "9").localeCompare(b.picTargetDate ?? "9");
      else if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [items, search, sortKey, sortDir]);

  const treeRows = useMemo((): TreeRow[] => {
    const childrenMap = new Map<string, SubFaseRow[]>();
    const parentRows: SubFaseRow[] = [];
    const orphans: SubFaseRow[] = [];
    const parentIdsInList = new Set(sorted.filter((r) => !r.parentSubFase).map((r) => r.id));

    for (const row of sorted) {
      if (!row.parentSubFase) {
        parentRows.push(row);
      } else if (parentIdsInList.has(row.parentSubFase.id)) {
        const arr = childrenMap.get(row.parentSubFase.id) ?? [];
        arr.push(row);
        childrenMap.set(row.parentSubFase.id, arr);
      } else {
        orphans.push(row);
      }
    }

    const result: TreeRow[] = [];
    for (const parent of parentRows) {
      const children = childrenMap.get(parent.id) ?? [];
      result.push({ ...parent, isChild: false, hasChildren: children.length > 0 });
      for (const child of children) {
        result.push({ ...child, isChild: true, hasChildren: false, parentId: parent.id });
      }
    }
    for (const orphan of orphans) {
      result.push({ ...orphan, isChild: true, hasChildren: false });
    }
    return result;
  }, [sorted]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const parentIds = useMemo(() => treeRows.filter((r) => r.hasChildren).map((r) => r.id), [treeRows]);
  const allCollapsed = parentIds.length > 0 && parentIds.every((id) => collapsedParents.has(id));

  const toggleParent = (id: string) => {
    setCollapsedParents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allCollapsed) setCollapsedParents(new Set());
    else setCollapsedParents(new Set(parentIds));
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k
      ? sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
      : <ChevronUp className="w-3 h-3 opacity-30" />;

  const openProject = (projectId: string, subFaseId?: string) => {
    sessionStorage.setItem("openProjectId", projectId);
    sessionStorage.setItem("openProjectTab", "phases");
    if (subFaseId) sessionStorage.setItem("highlightSubFaseId", subFaseId);
    router.push("/proyek");
  };

  const toggleDone = async (item: SubFaseRow) => {
    const next = !item.isDone;
    queryClient.setQueryData<SubFaseRow[]>(
      ["subfases-list", filterProject, filterFase, filterDone, filterProjectStatus, parentOnly],
      (old) => old?.map((r) => r.id === item.id ? { ...r, isDone: next } : r) ?? []
    );
    const res = await apiFetch(`/api/subfases/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDone: next }),
    });
    if (!res.ok) {
      queryClient.invalidateQueries({ queryKey: ["subfases-list"] });
      toast("error", t.mm.toastStatusError);
    }
  };

  const hasFilter = !!(search || filterProject || filterFase || filterDone !== "" || filterProjectStatus || filterPic);

  const exportExcel = () => {
    const rows = sorted.map((t, i) => ({
      No: i + 1,
      Project: t.project?.assNumber ?? "-",
      "Nama Project": t.project?.assName ?? "-",
      Customer: t.project?.customer ?? "-",
      Fase: FASE_LABELS[t.projectFase.fase as keyof typeof FASE_LABELS] ?? t.projectFase.fase,
      "Sub Phase": t.name,
      "Parent Sub Phase": t.parentSubFase?.name ?? "-",
      PIC: t.pic?.name ?? "-",
      "Tgl Mulai Customer": t.customerStartDate ? new Date(t.customerStartDate).toLocaleDateString("id-ID") : "-",
      "Tgl Target Customer": t.customerTargetDate ? new Date(t.customerTargetDate).toLocaleDateString("id-ID") : "-",
      "Tgl Mulai PIC": t.picStartDate ? new Date(t.picStartDate).toLocaleDateString("id-ID") : "-",
      "Tgl Target PIC": t.picTargetDate ? new Date(t.picTargetDate).toLocaleDateString("id-ID") : "-",
      Status: t.isDone ? sp.btnDone : sp.notDoneFilter,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sub Phases");
    XLSX.writeFile(wb, `sub-phases-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const total = items.length;
  const done = items.filter((t) => t.isDone).length;
  const notDone = total - done;
  const overdue = items.filter(
    (t) => !t.isDone && t.picTargetDate && new Date(t.picTargetDate) < new Date()
  ).length;

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ListChecks className="w-6 h-6 text-blue-600" />
            {sp.title}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{sp.subtitle}</p>
        </div>
        <button
          onClick={exportExcel}
          className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <Download className="w-4 h-4" /> {t.export}
        </button>
      </div>

      {/* KPI mini */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: sp.kpiTotal, value: total, color: "text-gray-700 bg-gray-50 border-gray-200" },
          { label: sp.kpiNotDone, value: notDone, color: "text-blue-700 bg-blue-50 border-blue-200" },
          { label: sp.kpiDone, value: done, color: "text-green-700 bg-green-50 border-green-200" },
          { label: sp.kpiOverdue, value: overdue, color: "text-red-700 bg-red-50 border-red-200" },
        ].map((k) => (
          <div key={k.label} className={`rounded-xl border p-4 ${k.color}`}>
            <div className="text-2xl font-bold">{k.value}</div>
            <div className="text-xs font-medium mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={sp.searchPlaceholder}
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
          value={filterProjectStatus}
          onChange={(e) => setFilterProjectStatus(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
        >
          <option value="">{sp.allProjectStatus}</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={filterFase}
          onChange={(e) => setFilterFase(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
        >
          <option value="">{sp.allPhases}</option>
          {Object.entries(FASE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={filterPic}
          onChange={(e) => setFilterPic(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
        >
          <option value="">{sp.allPic}</option>
          {picOptions.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
        <select
          value={filterDone}
          onChange={(e) => setFilterDone(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
        >
          <option value="">{sp.allStatus}</option>
          <option value="false">{sp.notDoneFilter}</option>
          <option value="true">{sp.doneFilter}</option>
        </select>
        <button
          onClick={() => setParentOnly((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors ${parentOnly ? "bg-indigo-600 text-white border-indigo-600" : "text-gray-600 border-gray-200 hover:bg-gray-50"}`}
        >
          {sp.parentOnly}{parentOnly ? " ✓" : ""}
        </button>
        {hasFilter && (
          <button
            onClick={() => { setSearch(""); setFilterProject(""); setFilterFase(""); setFilterDone(""); setFilterProjectStatus(""); setFilterPic(""); }}
            className="flex items-center gap-1 px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <X className="w-3.5 h-3.5" /> {t.reset}
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Table toolbar */}
        {parentIds.length > 0 && (
          <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/60">
            <p className="text-xs text-gray-500">
              <span className="font-semibold text-gray-700">{parentIds.length}</span> parent sub-phase
              {parentIds.length > 1 ? "s" : ""}
            </p>
            <button
              onClick={toggleAll}
              className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              {allCollapsed ? (
                <><ChevronDown className="w-3.5 h-3.5" /> {sp.expandAll}</>
              ) : (
                <><ChevronUp className="w-3.5 h-3.5" /> {sp.collapseAll}</>
              )}
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-blue-600 text-white">
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider w-10">{sp.colNo}</th>
                {[
                  { label: sp.colProject, key: "project" as SortKey },
                  { label: sp.colPhase, key: "fase" as SortKey },
                  { label: sp.colSubPhase, key: "name" as SortKey },
                ].map(({ label, key }) => (
                  <th
                    key={key}
                    onClick={() => toggleSort(key)}
                    className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-blue-700 select-none"
                  >
                    <div className="flex items-center gap-1">{label}<SortIcon k={key} /></div>
                  </th>
                ))}
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap">{sp.colPic}</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap">{sp.colCustStart}</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap">{sp.colCustTarget}</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap">{sp.colPicStart}</th>
                <th
                  onClick={() => toggleSort("picTargetDate")}
                  className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-blue-700 select-none"
                >
                  <div className="flex items-center gap-1">{sp.colPicTarget}<SortIcon k="picTargetDate" /></div>
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap">{sp.colStatus}</th>
                <th className="px-3 py-3 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    {Array.from({ length: 11 }).map((_, j) => (
                      <td key={j} className="px-3 py-3.5">
                        <div className="h-3 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-20 text-center text-gray-400">
                    <ListChecks className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                    <p className="font-medium">{sp.noData}</p>
                  </td>
                </tr>
              ) : (
                (() => {
                  let parentCounter = 0;
                  return treeRows.map((row) => {
                    if (row.isChild && row.parentId && collapsedParents.has(row.parentId)) return null;

                    const isOverdue = !row.isDone && row.picTargetDate && new Date(row.picTargetDate) < new Date();
                    const isCollapsed = !row.isChild && row.hasChildren && collapsedParents.has(row.id);
                    const isExpanded = !row.isChild && row.hasChildren && !collapsedParents.has(row.id);

                    if (!row.isChild) parentCounter++;
                    const rowNum = parentCounter;

                    return (
                      <tr
                        key={row.id}
                        className={`transition-colors
                          ${row.isChild
                            ? "bg-slate-50/70 hover:bg-slate-100/60"
                            : row.hasChildren
                              ? "bg-white hover:bg-blue-50/30 border-l-2 border-l-blue-400"
                              : "bg-white hover:bg-gray-50/60"}
                          ${isOverdue && !row.isChild ? "bg-red-50/40 hover:bg-red-50/60" : ""}
                          ${isOverdue && row.isChild ? "bg-red-50/30 hover:bg-red-50/50" : ""}
                          ${row.isDone ? "opacity-55" : ""}
                        `}
                      >
                        {/* # / expand */}
                        <td className="px-2 py-3 w-14">
                          {row.isChild ? (
                            <span className="block text-center text-gray-300 text-sm">└</span>
                          ) : (
                            <div className="flex items-center gap-1 justify-center">
                              <span className="text-xs text-gray-400 font-mono w-5 text-right shrink-0">{rowNum}</span>
                              {row.hasChildren && (
                                <button
                                  onClick={() => toggleParent(row.id)}
                                  className={`w-5 h-5 flex items-center justify-center rounded transition-colors shrink-0
                                    ${isExpanded ? "bg-blue-100 text-blue-600 hover:bg-blue-200" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
                                >
                                  {isCollapsed
                                    ? <ChevronRight className="w-3 h-3" />
                                    : <ChevronDown className="w-3 h-3" />}
                                </button>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Project */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          {row.project ? (
                            <div>
                              <span className="font-mono text-xs bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-medium">
                                {row.project.assNumber}
                              </span>
                              <p className="text-xs text-gray-400 mt-0.5 truncate max-w-28">{row.project.assName}</p>
                            </div>
                          ) : <span className="text-gray-300">—</span>}
                        </td>

                        {/* Phase */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-medium border border-indigo-100">
                            {FASE_LABELS[row.projectFase.fase as keyof typeof FASE_LABELS] ?? row.projectFase.fase}
                          </span>
                        </td>

                        {/* Sub-phase name */}
                        <td className="px-3 py-3 max-w-64">
                          {row.isChild ? (
                            <div className="ml-6 pl-3">
                              <p className={`text-sm leading-snug ${row.isDone ? "line-through text-gray-400" : "text-gray-600"}`}>
                                {row.name}
                              </p>
                              {row.description && (
                                <p className="text-xs text-gray-400 mt-0.5 truncate">{row.description}</p>
                              )}
                            </div>
                          ) : (
                            <div>
                              <p className={`text-sm leading-snug font-semibold ${row.isDone ? "line-through text-gray-400" : "text-gray-800"}`}>
                                {row.name}
                              </p>
                              {row.hasChildren && (
                                <p className="text-xs text-gray-400 mt-0.5">
                                  {treeRows.filter((r) => r.parentId === row.id).length} sub-item
                                  {isCollapsed ? " · collapsed" : ""}
                                </p>
                              )}
                              {row.description && (
                                <p className="text-xs text-gray-400 mt-0.5 truncate">{row.description}</p>
                              )}
                            </div>
                          )}
                        </td>

                        {/* PIC */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span className={`text-xs font-medium ${row.isChild ? "text-gray-500" : "text-gray-700"}`}>
                            {row.pic?.name ?? "—"}
                          </span>
                        </td>

                        {/* Cust Start */}
                        <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-500">
                          {row.customerStartDate ? formatDate(row.customerStartDate) : <span className="text-gray-300">—</span>}
                        </td>

                        {/* Cust Target */}
                        <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-500">
                          {row.customerTargetDate ? formatDate(row.customerTargetDate) : <span className="text-gray-300">—</span>}
                        </td>

                        {/* PIC Start */}
                        <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-500">
                          {row.picStartDate ? formatDate(row.picStartDate) : <span className="text-gray-300">—</span>}
                        </td>

                        {/* PIC Target */}
                        <td className={`px-3 py-3 whitespace-nowrap text-xs font-medium ${isOverdue ? "text-red-600" : "text-gray-600"}`}>
                          {row.picTargetDate ? (
                            <span className={isOverdue ? "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700" : ""}>
                              {formatDate(row.picTargetDate)}
                              {isOverdue && <span className="font-bold">!</span>}
                            </span>
                          ) : <span className="text-gray-300">—</span>}
                        </td>

                        {/* Status */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          <button
                            onClick={() => toggleDone(row)}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${
                              row.isDone
                                ? "bg-green-100 text-green-700 border-green-200 hover:bg-green-200"
                                : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${row.isDone ? "bg-green-500" : "bg-gray-400"}`} />
                            {row.isDone ? sp.btnDone : sp.btnNotDone}
                          </button>
                        </td>

                        {/* Open project */}
                        <td className="px-3 py-3">
                          {row.project && (
                            <button
                              onClick={() => openProject(row.project!.id, row.id)}
                              title={sp.openProjectTitle}
                              className="p-1.5 text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  });
                })()
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && (
          <div className="px-4 py-2.5 border-t border-gray-100 flex items-center justify-between bg-gray-50/40">
            <p className="text-xs text-gray-400">
              {treeRows.length} {sp.countOf} {items.length} {sp.countSuffix}
            </p>
            {collapsedParents.size > 0 && (
              <p className="text-xs text-blue-500">
                {collapsedParents.size} {sp.collapsedGroups}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
