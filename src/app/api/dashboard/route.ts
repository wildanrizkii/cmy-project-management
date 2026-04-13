import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const filterLeaderId = searchParams.get("leaderId") ?? "";
  const filterCustomer = searchParams.get("customer") ?? "";
  const filterProjectId = searchParams.get("projectId") ?? "";

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  // All projects unfiltered
  const allProjects = await db.project.findMany({
    include: {
      projectLeader: { select: { id: true, name: true } },
      fases: {
        include: { subFases: { select: { isDone: true } } },
      },
      _count: { select: { hinanhyoDRs: true } },
    },
  });

  // Compute overall progress — each of 4 phases contributes 25%
  const FASE_ORDER = ["RFQ", "DIE_GO", "EVENT_PROJECT", "MASS_PRO"] as const;
  const FASE_WEIGHT = 100 / FASE_ORDER.length;

  function getProgress(project: typeof allProjects[0]) {
    const fases = project.fases;
    if (!fases.length) return 0;
    let total = 0;
    for (const faseKey of FASE_ORDER) {
      const f = fases.find((x) => x.fase === faseKey);
      if (!f || f.subFases.length === 0) continue;
      const done = f.subFases.filter((s) => s.isDone).length;
      total += (done / f.subFases.length) * FASE_WEIGHT;
    }
    return Math.round(total);
  }

  // Apply chart filters
  let chartProjects = allProjects;
  if (filterLeaderId) chartProjects = chartProjects.filter((p) => p.projectLeaderId === filterLeaderId);
  if (filterCustomer) chartProjects = chartProjects.filter((p) => p.customer === filterCustomer);
  if (filterProjectId) chartProjects = chartProjects.filter((p) => p.id === filterProjectId);

  // ─── KPI ────────────────────────────────────────────────────────────────────
  const totalAktif = allProjects.filter((p) => p.status === "DALAM_PROSES").length;
  const totalTerlambat = allProjects.filter((p) => p.status === "TERLAMBAT").length;

  const totalHinanhyoPending = await db.hinanhyoDR.count({ where: { status: "PENDING" } });

  const activeProjects = allProjects.filter((p) => p.status === "DALAM_PROSES");
  const rataRataProgress =
    activeProjects.length > 0
      ? Math.round(activeProjects.reduce((s, p) => s + getProgress(p), 0) / activeProjects.length)
      : 0;

  const selesaiBulanIni = allProjects.filter(
    (p) =>
      p.status === "SELESAI" &&
      new Date(p.updatedAt) >= startOfMonth &&
      new Date(p.updatedAt) <= endOfMonth
  ).length;

  const deadline7Hari = allProjects.filter((p) => {
    const end = new Date(p.targetDate);
    return end >= now && end <= in7Days && p.status !== "SELESAI";
  }).length;

  // ─── SubFase Alerts ─────────────────────────────────────────────────────────
  const allSubFases = await db.subFase.findMany({
    where: { isDone: false },
    include: {
      pic: { select: { id: true, name: true } },
      projectFase: { select: { fase: true } },
    },
  });

  const subFaseAlerts = allSubFases
    .filter((sf) => sf.picTargetDate)
    .map((sf) => {
      const picTarget = new Date(sf.picTargetDate!);
      const custTarget = sf.customerTargetDate ? new Date(sf.customerTargetDate) : null;
      const diffPic = Math.ceil((picTarget.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const diffCust = custTarget ? Math.ceil((custTarget.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

      let alertLevel: "RED" | "ORANGE" | "YELLOW" | null = null;
      let alertMsg = "";

      if (diffCust !== null && diffCust < 0) {
        alertLevel = "RED";
        alertMsg = `Overdue ${Math.abs(diffCust)} day(s) from Customer target`;
      } else if (diffPic < 0) {
        alertLevel = "ORANGE";
        alertMsg = `Overdue ${Math.abs(diffPic)} day(s) from PIC target`;
      } else if (diffPic <= 3) {
        alertLevel = "YELLOW";
        alertMsg = `H-${diffPic} from PIC target`;
      }

      if (!alertLevel) return null;
      return { id: sf.id, projectId: sf.projectId, name: sf.name, picName: sf.pic.name, alertLevel, alertMsg };
    })
    .filter(Boolean);

  const redAlerts = subFaseAlerts.filter((a) => a?.alertLevel === "RED");
  const orangeAlerts = subFaseAlerts.filter((a) => a?.alertLevel === "ORANGE");
  const yellowAlerts = subFaseAlerts.filter((a) => a?.alertLevel === "YELLOW");

  // Project alerts for bell (legacy format)
  const alerts: Array<{
    level: "KRITIS" | "PERINGATAN" | "INFO";
    message: string;
    projectCode?: string;
    details?: { code: string; name: string; daysLate: number }[];
  }> = [];

  const terlambatProjects = allProjects
    .filter((p) => p.status === "TERLAMBAT")
    .map((p) => ({
      ...p,
      daysLate: Math.ceil((now.getTime() - new Date(p.targetDate).getTime()) / (1000 * 60 * 60 * 24)),
    }))
    .sort((a, b) => b.daysLate - a.daysLate);

  if (terlambatProjects.length === 1) {
    alerts.push({
      level: "KRITIS",
      message: `${terlambatProjects[0].assNumber} - ${terlambatProjects[0].assName} overdue by ${terlambatProjects[0].daysLate} days`,
      projectCode: terlambatProjects[0].assNumber,
      details: terlambatProjects.map((p) => ({ code: p.assNumber, name: p.assName, daysLate: p.daysLate })),
    });
  } else if (terlambatProjects.length > 1) {
    alerts.push({
      level: "KRITIS",
      message: `${terlambatProjects.length} projects are overdue`,
      details: terlambatProjects.map((p) => ({ code: p.assNumber, name: p.assName, daysLate: p.daysLate })),
    });
  }

  for (const p of allProjects.filter((p) => {
    const end = new Date(p.targetDate);
    return end >= now && end <= in7Days && p.status !== "SELESAI";
  })) {
    const days = Math.ceil((new Date(p.targetDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    alerts.push({
      level: "PERINGATAN",
      message: `${p.assNumber} deadline in ${days} days`,
      projectCode: p.assNumber,
    });
  }

  const oldPending = await db.hinanhyoDR.count({
    where: { status: "PENDING", createdAt: { lt: twoWeeksAgo } },
  });
  if (oldPending > 0) {
    alerts.push({ level: "PERINGATAN", message: `${oldPending} Hinanhyo/DR items pending for more than 14 days` });
  }

  const proyekBaruMingguIni = allProjects.filter((p) => new Date(p.createdAt) >= oneWeekAgo).length;
  if (proyekBaruMingguIni > 0) {
    alerts.push({ level: "INFO", message: `${proyekBaruMingguIni} new project(s) added this week` });
  }

  // ─── Charts ─────────────────────────────────────────────────────────────────

  const statusDist = ["BELUM_MULAI", "DALAM_PROSES", "SELESAI", "TERLAMBAT", "TUNDA"].map((s) => {
    const ps = chartProjects.filter((p) => p.status === s);
    return {
      status: s,
      count: ps.length,
      projects: ps.map((p) => ({ code: p.assNumber, name: p.assName })),
    };
  });

  const phaseDist = ["RFQ", "DIE_GO", "EVENT_PROJECT", "MASS_PRO"].map((f) => {
    const ps = chartProjects.filter((p) => p.currentFase === f);
    return {
      faseKey: f,
      count: ps.length,
      projects: ps.map((p) => ({ code: p.assNumber, name: p.assName })),
    };
  });

  const allHinanhyo = await db.hinanhyoDR.findMany({
    where: { projectId: { in: chartProjects.map((p) => p.id) } },
    select: { status: true, projectId: true },
  });

  const hinanhyoByProject = chartProjects
    .map((p) => {
      const hs = allHinanhyo.filter((h) => h.projectId === p.id);
      return {
        code: p.assNumber,
        name: p.assName,
        DITERIMA: hs.filter((h) => h.status === "DITERIMA").length,
        DITOLAK: hs.filter((h) => h.status === "DITOLAK").length,
        PENDING: hs.filter((h) => h.status === "PENDING").length,
        total: hs.length,
      };
    })
    .filter((p) => p.total > 0);

  const mpChart = chartProjects.map((p) => ({
    code: p.assNumber,
    name: p.assName,
    kebutuhan: p.kebutuhanMp,
    aktual: p.aktualMp ?? 0,
  }));

  const cycleTimeChart = chartProjects
    .filter((p) => p.startDate && p.targetDate)
    .map((p) => {
      const planned = Math.round((new Date(p.targetDate).getTime() - new Date(p.startDate!).getTime()) / 86400000);
      const elapsed = p.status === "SELESAI"
        ? planned
        : Math.round((now.getTime() - new Date(p.startDate!).getTime()) / 86400000);
      return {
        code: p.assNumber,
        name: p.assName,
        target: Math.max(0, planned),
        actual: Math.max(0, elapsed),
      };
    });

  // ─── Filter options ──────────────────────────────────────────────────────────
  const filterOptions = {
    leaders: Array.from(
      new Map(allProjects.map((p) => [p.projectLeaderId, { id: p.projectLeaderId, name: p.projectLeader.name }])).values()
    ),
    customers: [...new Set(allProjects.map((p) => p.customer))].sort(),
    projects: allProjects.map((p) => ({ id: p.id, code: p.assNumber, name: p.assName })),
  };

  // Task monitoring table
  const taskMonitoring = chartProjects.map((p) => {
    const targetDate = new Date(p.targetDate);
    const daysRemaining = Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return {
      code: p.assNumber,
      name: p.assName,
      leaderName: p.projectLeader.name,
      customer: p.customer,
      targetDate: p.targetDate,
      daysRemaining,
      status: p.status,
      overallProgress: getProgress(p),
    };
  });

  return Response.json({
    kpi: { totalAktif, totalTerlambat, totalHinanhyoPending, rataRataProgress, selesaiBulanIni, deadline7Hari },
    alerts,
    subFaseAlerts: { red: redAlerts, orange: orangeAlerts, yellow: yellowAlerts },
    charts: { statusDist, phaseDist, hinanhyoByProject, mpChart, cycleTimeChart },
    taskMonitoring,
    filterOptions,
  });
}
