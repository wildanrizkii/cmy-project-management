"use client";
import { apiFetch } from "@/lib/fetch-client";

import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Download, Save, Loader2, Timer, X } from "lucide-react";
import * as XLSX from "xlsx";
import { useToast } from "@/components/layout/toast-context";
import type { Project } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type CtGroup = { group: string; value: number | null };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseGroups(aktualCt: unknown): CtGroup[] {
  if (!Array.isArray(aktualCt)) return [];
  return aktualCt as CtGroup[];
}

function allGroupLabels(projects: Project[]): string[] {
  const set = new Set<string>();
  for (const p of projects) {
    parseGroups(p.aktualCt).forEach((g) => set.add(g.group));
  }
  // Sort by alphabet
  return Array.from(set).sort();
}

// ─── Inline Edit Modal ────────────────────────────────────────────────────────

function EditCtModal({
  project,
  onClose,
  onSaved,
}: {
  project: Project;
  onClose: () => void;
  onSaved: (updated: Project) => void;
}) {
  const { toast } = useToast();
  const rawGroups = parseGroups(project.aktualCt);
  const [targetCt, setTargetCt] = useState(
    project.targetCt !== null && project.targetCt !== undefined
      ? String(project.targetCt)
      : ""
  );
  const [groups, setGroups] = useState<CtGroup[]>(rawGroups);
  const [saving, setSaving] = useState(false);

  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  const addGroup = () => {
    const label = ALPHABET[groups.length] ?? `G${groups.length + 1}`;
    setGroups((prev) => [...prev, { group: label, value: null }]);
  };

  const removeLastGroup = () => setGroups((prev) => prev.slice(0, -1));

  const updateValue = (i: number, val: string) =>
    setGroups((prev) =>
      prev.map((g, idx) =>
        idx === i ? { ...g, value: val !== "" ? parseFloat(val) : null } : g
      )
    );

  const save = async () => {
    setSaving(true);
    const res = await apiFetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetCt: targetCt !== "" ? parseFloat(targetCt) : null,
        aktualCt: groups,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { toast("error", data.error ?? "Update failed"); return; }
    toast("success", "Cycle Time has been saved");
    onSaved(data);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <p className="text-xs text-gray-400 font-mono">{project.assNumber}</p>
            <h3 className="font-bold text-gray-900 mt-0.5">{project.assName}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Target CT */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Target Cycle Time
            </label>
            <div className="relative w-44">
              <input
                type="number"
                min="0"
                step="any"
                value={targetCt}
                onChange={(e) => setTargetCt(e.target.value)}
                placeholder="—"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-base font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-14"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">unit</span>
            </div>
          </div>

          {/* Actual CT Groups */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Actual CT per Group
              </label>
              <div className="flex gap-2">
                {groups.length > 0 && (
                  <button
                    onClick={removeLastGroup}
                    className="text-xs px-2.5 py-1 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                  >
                    − Delete {groups[groups.length - 1]?.group}
                  </button>
                )}
                {groups.length < 26 && (
                  <button
                    onClick={addGroup}
                    className="text-xs px-2.5 py-1 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    + Add Group
                  </button>
                )}
              </div>
            </div>

            {groups.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">
                Belum ada group. Klik <span className="text-blue-500 font-medium">+ Add Group</span>.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {groups.map((g, i) => {
                  const target = targetCt !== "" ? parseFloat(targetCt) : null;
                  const over = target !== null && g.value !== null && g.value > target;
                  const under = target !== null && g.value !== null && g.value <= target;
                  return (
                    <div key={g.group} className={`rounded-lg border p-2.5 ${over ? "border-red-200 bg-red-50" : under ? "border-green-200 bg-green-50" : "border-gray-200 bg-gray-50"}`}>
                      <p className="text-xs font-bold text-gray-500 mb-1.5">
                        Group <span className="text-blue-600">{g.group}</span>
                      </p>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={g.value !== null && g.value !== undefined ? String(g.value) : ""}
                          onChange={(e) => updateValue(i, e.target.value)}
                          placeholder="—"
                          className="w-full border border-gray-200 rounded px-2 py-1 text-sm font-semibold bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 pr-9"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">s</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save
          </button>
          <button onClick={onClose} className="px-5 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CycleTimePage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [filterCustomer, setFilterCustomer] = useState("");
  const [filterLeader, setFilterLeader] = useState("");
  const [editProject, setEditProject] = useState<Project | null>(null);

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ["projects-ct"],
    queryFn: () => apiFetch("/api/projects").then((r) => r.json()),
  });

  // Filter
  const filtered = useMemo(() => {
    return projects.filter((p) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        p.assNumber.toLowerCase().includes(q) ||
        p.assName.toLowerCase().includes(q);
      const matchCustomer = !filterCustomer || p.customer === filterCustomer;
      const matchLeader =
        !filterLeader ||
        (p.projectLeader?.name ?? "") === filterLeader;
      return matchSearch && matchCustomer && matchLeader;
    });
  }, [projects, search, filterCustomer, filterLeader]);

  // Unique values for dropdowns
  const customers = useMemo(
    () => [...new Set(projects.map((p) => p.customer))].sort(),
    [projects]
  );
  const leaders = useMemo(
    () => [...new Set(projects.map((p) => p.projectLeader?.name ?? "").filter(Boolean))].sort(),
    [projects]
  );

  // Collect ALL group labels across filtered projects
  const groupLabels = useMemo(() => allGroupLabels(filtered), [filtered]);

  // Export
  const handleExport = () => {
    const rows = filtered.map((p) => {
      const groups = parseGroups(p.aktualCt);
      const row: Record<string, string | number> = {
        "Assy Number": p.assNumber,
        "Assy Name": p.assName,
        Customer: p.customer,
        "Project Leader": p.projectLeader?.name ?? "-",
        "Target CT (s)": p.targetCt ?? "-",
      };
      groupLabels.forEach((label) => {
        const g = groups.find((x) => x.group === label);
        row[`Group ${label} (s)`] = g?.value ?? "-";
      });
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cycle Time");
    XLSX.writeFile(wb, `cycle-time-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast("success", "Export success");
  };

  const hasFilter = search || filterCustomer || filterLeader;

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm shadow-blue-200">
            <Timer className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cycle Time</h1>
            <p className="text-sm text-gray-500 mt-0.5">{filtered.length} project(s)</p>
          </div>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition-colors"
        >
          <Download className="w-4 h-4" />
          Export Excel
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="flex-1 min-w-52 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari Assy Number / Assy Name..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Customer */}
          <select
            value={filterCustomer}
            onChange={(e) => setFilterCustomer(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
          >
            <option value="">All Customer</option>
            {customers.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Project Leader */}
          <select
            value={filterLeader}
            onChange={(e) => setFilterLeader(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
          >
            <option value="">All Project Leader</option>
            {leaders.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>

          {hasFilter && (
            <button
              onClick={() => { setSearch(""); setFilterCustomer(""); setFilterLeader(""); }}
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
                {/* Fixed columns */}
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Assy Number</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Assy Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Project Leader</th>
                {/* Target CT */}
                <th className="px-4 py-3 text-center text-xs font-semibold text-blue-600 uppercase tracking-wider whitespace-nowrap bg-blue-50/50">
                  Target CT <span className="font-normal text-gray-400"></span>
                </th>
                {/* Dynamic group columns */}
                {groupLabels.map((label) => (
                  <th
                    key={label}
                    className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                  >
                    Grup {label} <span className="font-normal text-gray-400"></span>
                  </th>
                ))}
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan={5 + groupLabels.length + 1} className="py-16 text-center text-gray-400">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Memuat...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5 + groupLabels.length + 1} className="py-16 text-center text-gray-400">
                    Tidak ada data ditemukan
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const groups = parseGroups(p.aktualCt);
                  const target = p.targetCt;

                  return (
                    <tr key={p.id} className="hover:bg-gray-50/70 transition-colors">
                      {/* Assy Number */}
                      <td className="px-4 py-3 font-mono font-medium text-gray-600 text-xs whitespace-nowrap">
                        {p.assNumber}
                      </td>
                      {/* Assy Name */}
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{p.assName}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{p.model}</p>
                      </td>
                      {/* Customer */}
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{p.customer}</td>
                      {/* Project Leader */}
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {p.projectLeader?.name ?? "-"}
                      </td>
                      {/* Target CT */}
                      <td className="px-4 py-3 text-center bg-blue-50/30 whitespace-nowrap">
                        {target !== null && target !== undefined ? (
                          <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
                            {target}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-base">—</span>
                        )}
                      </td>
                      {/* Group columns */}
                      {groupLabels.map((label) => {
                        const g = groups.find((x) => x.group === label);
                        const val = g?.value;
                        const isOver = target !== null && target !== undefined && val !== null && val !== undefined && val > target;
                        const isUnder = target !== null && target !== undefined && val !== null && val !== undefined && val <= target;
                        return (
                          <td key={label} className="px-4 py-3 text-center whitespace-nowrap">
                            {val !== null && val !== undefined ? (
                              <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full font-semibold text-sm ${isOver ? "bg-red-100 text-red-700" : isUnder ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                                {val}
                              </span>
                            ) : (
                              <span className="text-gray-300 text-base">—</span>
                            )}
                          </td>
                        );
                      })}
                      {/* Edit action */}
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setEditProject(p)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors whitespace-nowrap"
                        >
                          <Timer className="w-3.5 h-3.5" />
                          Edit CT
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Summary bar */}
        {filtered.length > 0 && groupLabels.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex flex-wrap gap-6">
            <span className="text-xs font-semibold text-gray-500 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-green-400 inline-block" />
              ≤ Target
            </span>
            <span className="text-xs font-semibold text-gray-500 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />
              &gt; Target
            </span>
            <span className="text-xs font-semibold text-gray-500 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-gray-300 inline-block" />
              — = Tidak ada data
            </span>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editProject && (
        <EditCtModal
          project={editProject}
          onClose={() => setEditProject(null)}
          onSaved={(updated) => {
            queryClient.setQueryData<Project[]>(["projects-ct"], (old) =>
              old ? old.map((p) => (p.id === updated.id ? updated : p)) : [updated]
            );
            setEditProject(null);
          }}
        />
      )}
    </div>
  );
}
