"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getStatusColor } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { FileSpreadsheet, FileText, Download } from "lucide-react";

interface TaskSummary {
  status: string | null;
  priority: string | null;
  dueDate: Date | null;
  progress: number | null;
}

interface ProjectData {
  id: string;
  name: string;
  status: string;
  tasks: TaskSummary[] | null;
  members: { id: string }[];
  _count: { tasks: number; members: number } | null;
}

const STATUS_COLORS: Record<string, string> = {
  TODO: "#94a3b8",
  IN_PROGRESS: "#3b82f6",
  DONE: "#22c55e",
};

const STATUS_LABELS: Record<string, string> = {
  TODO: "Belum", IN_PROGRESS: "Proses", DONE: "Selesai",
};

const STATUS_PROJECT: Record<string, string> = {
  ACTIVE: "Aktif", COMPLETED: "Selesai", ON_HOLD: "Ditunda", ARCHIVED: "Arsip",
};

function safeProgress(t: TaskSummary) {
  return t.progress ?? 0;
}

function safeStatus(t: TaskSummary) {
  return t.status ?? "TODO";
}

export function ReportsClient({ projects }: { projects: ProjectData[] }) {
  const [exporting, setExporting] = useState<"xlsx" | "pdf" | null>(null);

  if (!projects || projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground">
        <p className="text-lg font-medium">Belum ada proyek</p>
        <p className="text-sm mt-1">Buat proyek terlebih dahulu untuk melihat laporan.</p>
      </div>
    );
  }

  const allTasks = projects.flatMap((p) => p.tasks ?? []);

  const taskStatusData = Object.entries(
    allTasks.reduce<Record<string, number>>((acc, t) => {
      const status = safeStatus(t);
      acc[status] = (acc[status] ?? 0) + 1;
      return acc;
    }, {})
  ).map(([status, count]) => ({ name: STATUS_LABELS[status] ?? status, value: count, status }));

  const projectBarData = projects.map((p) => ({
    name: p.name.length > 15 ? p.name.slice(0, 15) + "…" : p.name,
    Tugas: p._count?.tasks ?? 0,
    Selesai: (p.tasks ?? []).filter((t) => safeStatus(t) === "DONE").length,
  }));

  function avgProgress(tasks: TaskSummary[] | null) {
    const list = tasks ?? [];
    if (list.length === 0) return 0;
    return Math.round(list.reduce((s, t) => s + safeProgress(t), 0) / list.length);
  }

  async function exportXLSX() {
    setExporting("xlsx");
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();

      const projectRows = projects.map((p) => ({
        "Nama Proyek": p.name,
        "Status": STATUS_PROJECT[p.status] ?? p.status,
        "Total Tugas": p._count?.tasks ?? 0,
        "Selesai": (p.tasks ?? []).filter((t) => safeStatus(t) === "DONE").length,
        "Proses": (p.tasks ?? []).filter((t) => safeStatus(t) === "IN_PROGRESS").length,
        "Belum": (p.tasks ?? []).filter((t) => safeStatus(t) === "TODO").length,
        "Anggota": p._count?.members ?? 0,
        "Rata-rata Progress": avgProgress(p.tasks) + "%",
      }));
      const ws1 = XLSX.utils.json_to_sheet(projectRows);
      XLSX.utils.book_append_sheet(wb, ws1, "Ringkasan Proyek");

      const taskRows = projects.flatMap((p) =>
        (p.tasks ?? []).map((t) => ({
          "Proyek": p.name,
          "Status": STATUS_LABELS[safeStatus(t)] ?? safeStatus(t),
          "Prioritas": t.priority ?? "-",
          "Tenggat": t.dueDate ? new Date(t.dueDate).toLocaleDateString("id-ID") : "-",
          "Progress": safeProgress(t) + "%",
        }))
      );
      const ws2 = XLSX.utils.json_to_sheet(taskRows.length ? taskRows : [{ "Info": "Belum ada tugas" }]);
      XLSX.utils.book_append_sheet(wb, ws2, "Detail Tugas");

      XLSX.writeFile(wb, `laporan-proyek-${new Date().toISOString().split("T")[0]}.xlsx`);
    } finally {
      setExporting(null);
    }
  }

  async function exportPDF() {
    setExporting("pdf");
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: html2canvas } = await import("html2canvas");

      const el = document.getElementById("report-content");
      if (!el) return;

      const canvas = await html2canvas(el, { scale: 1.5, useCORS: true });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`laporan-proyek-${new Date().toISOString().split("T")[0]}.pdf`);
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={exportXLSX} disabled={!!exporting}>
          {exporting === "xlsx" ? (
            <Download className="h-4 w-4 animate-bounce" />
          ) : (
            <FileSpreadsheet className="h-4 w-4 text-green-600" />
          )}
          Ekspor XLSX
        </Button>
        <Button variant="outline" onClick={exportPDF} disabled={!!exporting}>
          {exporting === "pdf" ? (
            <Download className="h-4 w-4 animate-bounce" />
          ) : (
            <FileText className="h-4 w-4 text-red-600" />
          )}
          Ekspor PDF
        </Button>
      </div>

      <div id="report-content" className="space-y-6">
        {/* Summary stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Proyek", value: projects.length },
            { label: "Total Tugas", value: allTasks.length },
            { label: "Tugas Selesai", value: allTasks.filter((t) => safeStatus(t) === "DONE").length },
            {
              label: "Rata-rata Progress",
              value: allTasks.length ? avgProgress(allTasks) + "%" : "0%",
            },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="pt-4">
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tugas per Proyek</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={projectBarData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Tugas" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Selesai" fill="#22c55e" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Pie chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Distribusi Status Tugas</CardTitle>
            </CardHeader>
            <CardContent>
              {taskStatusData.length === 0 ? (
                <div className="h-62.5 flex items-center justify-center text-muted-foreground text-sm">
                  Belum ada tugas
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={taskStatusData} cx="50%" cy="50%" outerRadius={80} dataKey="value">
                      {taskStatusData.map((entry, i) => (
                        <Cell key={i} fill={STATUS_COLORS[entry.status] ?? "#94a3b8"} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => [`${v} tugas`]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Projects table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ringkasan Proyek</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {["Nama Proyek", "Status", "Total Tugas", "Selesai", "Anggota", "Progress"].map((h) => (
                      <th key={h} className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {projects.map((p) => {
                    const tasks = p.tasks ?? [];
                    const done = tasks.filter((t) => safeStatus(t) === "DONE").length;
                    const avg = avgProgress(tasks);
                    return (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{p.name}</td>
                        <td className="px-4 py-3">
                          <Badge className={getStatusColor(p.status)} variant="outline">
                            {STATUS_PROJECT[p.status] ?? p.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">{p._count?.tasks ?? 0}</td>
                        <td className="px-4 py-3 text-green-600 font-medium">{done}</td>
                        <td className="px-4 py-3">{p._count?.members ?? 0}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-20 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${avg}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">{avg}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
