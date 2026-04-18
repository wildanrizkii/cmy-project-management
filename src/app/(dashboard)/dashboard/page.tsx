"use client";
import { apiFetch } from "@/lib/fetch-client";

import { useQuery } from "@tanstack/react-query";
import { DashboardLoader } from "@/components/layout/page-loader";
import { useState, useEffect } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Activity,
  Calendar,
  Users,
  BarChart3,
  AlertCircle,
  X,
} from "lucide-react";
import { formatDate, getStatusColor, getFaseChartColor } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { STATUS_LABELS, FASE_LABELS } from "@/types";
import { useLanguage } from "@/contexts/language-context";
import { CycleTimeChart } from "@/components/cycletime";
import { ScheduleCustomerChart } from "@/components/dashboard/schedule-customer-chart";

const STATUS_COLORS: Record<string, string> = {
  BELUM_MULAI: "#94a3b8",
  DALAM_PROSES: "#3b82f6",
  SELESAI: "#22c55e",
  TERLAMBAT: "#ef4444",
  TUNDA: "#f97316",
};

// ─── Custom Tooltips ──────────────────────────────────────────────────────────

type ProjectRef = { code: string; name: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTooltipProps = Record<string, any>;

function ProjectListTooltip(props: AnyTooltipProps & { labelKey: string; countKey: string }) {
  const { active, payload, labelKey, countKey } = props;
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as Record<string, unknown>;
  const label = d[labelKey] as string;
  const count = d[countKey] as number;
  const projects = (d.projects ?? []) as ProjectRef[];
  if (!count) return null;
  return (
    <div className="bg-white border border-gray-200 shadow-xl rounded-xl p-3 text-xs max-w-56">
      <p className="font-semibold text-gray-900 mb-1.5">
        {label} - <span className="text-blue-600">{count} project(s)</span>
      </p>
      <div className="space-y-0.5 max-h-36 overflow-y-auto">
        {projects.length > 0 ? (
          projects.map((p) => (
            <p key={p.code} className="text-gray-600 truncate">
              <span className="font-mono font-medium text-gray-800">{p.code}</span> {p.name}
            </p>
          ))
        ) : (
          <p className="text-gray-400 italic">No projects</p>
        )}
      </div>
    </div>
  );
}


function StatusPieTooltip(props: AnyTooltipProps) {
  const { active, payload } = props;
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as { name: string; value: number; projects: ProjectRef[] };
  if (!d.value) return null;
  return (
    <div className="bg-white border border-gray-200 shadow-xl rounded-xl p-3 text-xs max-w-56">
      <p className="font-semibold text-gray-900 mb-1.5">
        {d.name} - <span className="text-blue-600">{d.value} project(s)</span>
      </p>
      <div className="space-y-0.5 max-h-36 overflow-y-auto">
        {d.projects?.map((p) => (
          <p key={p.code} className="text-gray-600 truncate">
            <span className="font-mono font-medium text-gray-800">{p.code}</span> {p.name}
          </p>
        ))}
      </div>
    </div>
  );
}

// Label rendered inside pie segments
function PieCountLabel({
  cx, cy, midAngle, innerRadius, outerRadius, value,
}: {
  cx: number; cy: number; midAngle: number;
  innerRadius: number; outerRadius: number; value: number;
}) {
  if (!value) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"
      fontSize={13} fontWeight="bold">
      {value}
    </text>
  );
}

// ─── Clock - isolated so it doesn't trigger chart re-renders ─────────────────
function ClockDisplay() {
  const { lang } = useLanguage();
  const locale = lang === "id" ? "id-ID" : "en-GB";
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex items-center gap-3 bg-white border border-gray-100 shadow-sm rounded-xl px-4 py-2.5 self-start sm:self-auto">
      <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
      <span className="text-sm text-gray-600 hidden sm:block">
        {now.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
      </span>
      <span className="text-gray-300 text-sm hidden sm:block">|</span>
      <span className="font-mono text-blue-600 font-semibold tabular-nums text-sm tracking-wider">
        {now.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { t } = useLanguage();
  const db = t.dashboard;
  const sl = t.statusLabels;
  const [monitorPage, setMonitorPage] = useState(1);
  const monitorPerPage = 8;

  const [filterLeaderId, setFilterLeaderId] = useState("");
  const [filterCustomer, setFilterCustomer] = useState("");
  const [filterProjectId, setFilterProjectId] = useState("");
  const [ctSelectedId, setCtSelectedId] = useState<string>("");

  const hasFilter = filterLeaderId || filterCustomer || filterProjectId;

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", filterLeaderId, filterCustomer, filterProjectId],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filterLeaderId) params.set("leaderId", filterLeaderId);
      if (filterCustomer) params.set("customer", filterCustomer);
      if (filterProjectId) params.set("projectId", filterProjectId);
      return apiFetch(`/api/dashboard?${params}`).then((r) => r.json());
    },
    refetchInterval: 30000,
    staleTime: 25000,
    refetchOnWindowFocus: false,
  });

  if (isLoading) return <DashboardLoader />;

  const kpi = data?.kpi ?? {};
  const charts = data?.charts ?? {};
  const taskMonitoring = data?.taskMonitoring ?? [];
  const filterOptions = data?.filterOptions ?? { leaders: [], customers: [], projects: [] };

  // ─── KPI cards ──────────────────────────────────────────────────────────────
  const kpiCards = [
    { label: db.kpiActive, value: kpi.totalAktif ?? 0, icon: Activity, bg: "bg-blue-50", text: "text-blue-700" },
    { label: db.kpiOverdue, value: kpi.totalTerlambat ?? 0, icon: AlertTriangle, bg: "bg-red-50", text: "text-red-700" },
    { label: db.kpiHinanhyo, value: kpi.totalHinanhyoPending ?? 0, icon: AlertCircle, bg: "bg-orange-50", text: "text-orange-700" },
    { label: db.kpiAvgProgress, value: `${kpi.rataRataProgress ?? 0}%`, icon: TrendingUp, bg: "bg-green-50", text: "text-green-700" },
    { label: db.kpiCompletedMonth, value: kpi.selesaiBulanIni ?? 0, icon: CheckCircle2, bg: "bg-emerald-50", text: "text-emerald-700" },
    { label: db.kpiDeadline7, value: kpi.deadline7Hari ?? 0, icon: Clock, bg: "bg-yellow-50", text: "text-yellow-700" },
  ];

  // ─── Chart data ──────────────────────────────────────────────────────────────
  const statusChartData = (charts.statusDist ?? []).map(
    (d: { status: string; count: number; projects: ProjectRef[] }) => ({
      name: sl[d.status as keyof typeof sl] ?? STATUS_LABELS[d.status as keyof typeof STATUS_LABELS] ?? d.status,
      value: d.count,
      status: d.status,
      projects: d.projects,
    }),
  );

  const phaseChartData = (charts.phaseDist ?? []).map(
    (d: { faseKey: string; count: number; projects: ProjectRef[] }) => ({
      fase: FASE_LABELS[d.faseKey as keyof typeof FASE_LABELS] ?? d.faseKey,
      count: d.count,
      projects: d.projects,
    }),
  );

  const scheduleByProject: {
    projectId: string; assNumber: string; assName: string;
    revisions: { id: string; revisionDate: string; rfqDate: string | null; dieGoDate: string | null; pp1Date: string | null; pp2Date: string | null; pp3Date: string | null; mpDate: string | null; notes: string | null }[];
  }[] = charts.scheduleByProject ?? [];

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">{db.subtitle}</p>
        </div>
        <ClockDisplay />
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider shrink-0">{db.filterChart}</span>
          <select
            value={filterProjectId}
            onChange={(e) => { setFilterProjectId(e.target.value); setMonitorPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 min-w-40"
          >
            <option value="">{t.allProjects}</option>
            {filterOptions.projects.map((p: { id: string; code: string; name: string }) => (
              <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
            ))}
          </select>
          <select
            value={filterLeaderId}
            onChange={(e) => { setFilterLeaderId(e.target.value); setMonitorPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 min-w-36"
          >
            <option value="">{db.allLeaders}</option>
            {filterOptions.leaders.map((p: { id: string; name: string }) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select
            value={filterCustomer}
            onChange={(e) => { setFilterCustomer(e.target.value); setMonitorPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 min-w-36"
          >
            <option value="">{db.allCustomers}</option>
            {filterOptions.customers.map((c: string) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {hasFilter && (
            <button
              onClick={() => { setFilterLeaderId(""); setFilterCustomer(""); setFilterProjectId(""); setMonitorPage(1); }}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              {t.reset}
            </button>
          )}
          {hasFilter && (
            <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded-full">
              {db.filterActive} - {taskMonitoring.length} project(s)
            </span>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpiCards.map(({ label, value, icon: Icon, bg, text }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center mb-3`}>
              <Icon className={`w-5 h-5 ${text}`} />
            </div>
            <div className={`text-2xl font-bold ${text}`}>{value}</div>
            <div className="text-xs text-gray-500 mt-0.5 font-medium">{label}</div>
          </div>
        ))}
      </div>

      {/* Charts Row 1: Status + Fase + Hinanhyo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

        {/* Chart 1: Distribusi Status - Pie with count labels always visible */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-600" />
            {db.chartStatusTitle}
          </h2>
          <p className="text-xs text-gray-400 mb-3">{db.chartHover}</p>
          {statusChartData.every((d: { value: number }) => d.value === 0) ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">{db.noData}</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={78}
                    dataKey="value"
                    labelLine={false}
                    label={PieCountLabel as never}
                    isAnimationActive={false}
                  >
                    {statusChartData.map((entry: { status: string }, i: number) => (
                      <Cell key={i} fill={STATUS_COLORS[entry.status] ?? "#94a3b8"} />
                    ))}
                  </Pie>
                  <Tooltip content={<StatusPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 justify-center">
                {statusChartData.filter((d: { value: number }) => d.value > 0).map((d: { status: string; name: string; value: number }) => (
                  <span key={d.status} className="flex items-center gap-1 text-xs text-gray-600">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLORS[d.status] }} />
                    {d.name} ({d.value})
                  </span>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Chart 2: Count Proyek per Fase - vertical bar */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            {db.chartPhaseTitle}
          </h2>
          <p className="text-xs text-gray-400 mb-3">{db.chartHover}</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={phaseChartData} margin={{ top: 20, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="fase" fontSize={11} tick={{ fill: "#6b7280" }} />
              <YAxis allowDecimals={false} fontSize={11} tick={{ fill: "#6b7280" }} />
              <Tooltip
                content={(props) => (
                  <ProjectListTooltip {...props} labelKey="fase" countKey="count" />
                )}
              />
              <Bar
                dataKey="count"
                name="Projects"
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
                label={{ position: "top", fontSize: 12, fontWeight: "bold", fill: "#1d4ed8" }}
              >
                {phaseChartData.map((entry: { fase: string; count: number }, i: number) => {
                  const faseKey = Object.entries(FASE_LABELS).find(([, v]) => v === entry.fase)?.[0] ?? "";
                  return <Cell key={i} fill={getFaseChartColor(faseKey)} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 3: Schedule Customer */}
        <ScheduleCustomerChart scheduleByProject={hasFilter ? scheduleByProject : scheduleByProject.slice(0, 4)} />
      </div>

      {/* Charts Row 2: MP + Cycle Time */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Manpower */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            {db.mpTitle}
          </h2>
          {(charts.mpChart ?? []).length === 0 ? (
            <div className="h-40 flex items-center justify-center text-gray-400 text-sm">{db.noMpData}</div>
          ) : (
            <div className="overflow-x-auto">
              <BarChart width={Math.max(500, (charts.mpChart ?? []).length * 70)} height={360} data={charts.mpChart ?? []} margin={{ top: 20, left: -10, right: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="code" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Legend fontSize={11} />
                <Bar dataKey="kebutuhan" name={db.mpRequired} fill="#93c5fd" radius={[4, 4, 0, 0]} isAnimationActive={false}
                  label={{ position: "top", fontSize: 10, fontWeight: "bold", fill: "#1e40af" }} />
                <Bar dataKey="aktual" name={db.mpActual} fill="#3b82f6" radius={[4, 4, 0, 0]} isAnimationActive={false}
                  label={{ position: "top", fontSize: 10, fontWeight: "bold", fill: "#1d4ed8" }} />
              </BarChart>
            </div>
          )}
        </div>

        {/* Cycle Time */}
        <div className="min-w-0">
          {(() => {
            type CtProject = Parameters<typeof CycleTimeChart>[0]["projects"][0];
            const ctProjects = (charts.ctProjects ?? []) as CtProject[];
            const withData = ctProjects.filter(
              (p) => Array.isArray(p.aktualCt) && (p.aktualCt as { value: number | null }[]).some((g) => g.value !== null)
            );
            // Default: show 5 most recent projects with CT data (or all if fewer than 5)
            const defaultProjects = withData.length > 0 ? withData.slice(0, 5) : ctProjects.slice(0, 5);
            const displayProjects = ctSelectedId
              ? ctProjects.filter((p) => p.id === ctSelectedId)
              : defaultProjects;

            return (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-blue-600" />
                      {db.ctTitle}
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {ctSelectedId ? db.ctFiltered : db.ctRecent}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={ctSelectedId}
                      onChange={(e) => setCtSelectedId(e.target.value)}
                      className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 max-w-52"
                    >
                      <option value="">{db.ctLatest}</option>
                      {ctProjects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.assNumber} - {p.assName}
                        </option>
                      ))}
                    </select>
                    {ctSelectedId && (
                      <button
                        onClick={() => setCtSelectedId("")}
                        className="text-xs text-gray-400 hover:text-gray-700 border border-gray-200 rounded-lg px-2 py-1.5 hover:bg-gray-50 transition-colors whitespace-nowrap"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
                {displayProjects.length > 0 ? (
                  <CycleTimeChart projects={displayProjects} height={260} />
                ) : (
                  <div className="h-64 flex items-center justify-center text-gray-400 text-sm">{db.noCTData}</div>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Task Monitoring Table */}
      {(() => {
        const totalMonitorPages = Math.ceil(taskMonitoring.length / monitorPerPage);
        const paginatedMonitor = taskMonitoring.slice(
          (monitorPage - 1) * monitorPerPage,
          monitorPage * monitorPerPage,
        );
        return (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-semibold text-gray-900">{db.taskMonTitle}</h2>
                <span className="text-xs text-gray-400">({taskMonitoring.length} project(s))</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {[db.colAssyNo, db.colAssyName, db.colLeader, db.colCustomer, db.colTargetDate, db.colDaysRemaining, t.status, db.colProgress].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginatedMonitor.map(
                    (row: {
                      code: string; name: string; leaderName: string; customer: string;
                      targetDate: string; daysRemaining: number; status: string; overallProgress: number;
                    }) => {
                      const isLate = row.daysRemaining < 0;
                      const isNear = row.daysRemaining >= 0 && row.daysRemaining <= 7;
                      return (
                        <tr key={row.code} className={isLate ? "bg-red-50" : isNear ? "bg-yellow-50" : ""}>
                          <td className="px-4 py-3 font-mono font-medium text-gray-700 whitespace-nowrap">{row.code}</td>
                          <td className="px-4 py-3 font-medium text-gray-900 max-w-40 truncate">{row.name}</td>
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{row.leaderName}</td>
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{row.customer}</td>
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(row.targetDate ?? row.code)}</td>
                          <td className={`px-4 py-3 font-semibold whitespace-nowrap ${isLate ? "text-red-600" : isNear ? "text-yellow-600" : "text-gray-600"}`}>
                            {isLate ? `${db.overdueBy} ${-row.daysRemaining} ${db.daysSuffix}` : row.daysRemaining === 0 ? db.dueToday : `${row.daysRemaining} ${db.daysLeft}`}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(row.status)}`}>
                              {sl[row.status as keyof typeof sl] ?? STATUS_LABELS[row.status as keyof typeof STATUS_LABELS] ?? row.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-gray-200 rounded-full min-w-14">
                                <div className="h-1.5 bg-blue-500 rounded-full" style={{ width: `${row.overallProgress}%` }} />
                              </div>
                              <span className="text-xs text-gray-600 font-medium">{row.overallProgress}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>
              {taskMonitoring.length === 0 && (
                <div className="py-12 text-center text-gray-400 text-sm">{db.noProjectData}</div>
              )}
            </div>
            {totalMonitorPages > 1 && (
              <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  {(monitorPage - 1) * monitorPerPage + 1}–{Math.min(monitorPage * monitorPerPage, taskMonitoring.length)} of {taskMonitoring.length}
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setMonitorPage(Math.max(1, monitorPage - 1))} disabled={monitorPage === 1}
                    className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40">‹</button>
                  {Array.from({ length: totalMonitorPages }, (_, i) => i + 1).map((n) => (
                    <button key={n} onClick={() => setMonitorPage(n)}
                      className={`px-2.5 py-1 text-xs border rounded ${monitorPage === n ? "bg-blue-600 text-white border-blue-600" : "border-gray-200 hover:bg-gray-50"}`}>
                      {n}
                    </button>
                  ))}
                  <button onClick={() => setMonitorPage(Math.min(totalMonitorPages, monitorPage + 1))} disabled={monitorPage === totalMonitorPages}
                    className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40">›</button>
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
