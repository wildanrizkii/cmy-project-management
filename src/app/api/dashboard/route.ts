import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const filterPicId = searchParams.get("picId") ?? "";
  const filterCustomer = searchParams.get("customer") ?? "";
  const filterProjectId = searchParams.get("projectId") ?? "";

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const baseWhere = session.user.role === "BAWAHAN" ? { picId: session.user.id } : {};

  // All projects (unfiltered) — used for KPI and filter options
  const allProjectsBase = await db.project.findMany({
    where: baseWhere,
    include: {
      pic: { select: { id: true, name: true, email: true, role: true, department: true, createdAt: true } },
      _count: { select: { hinanhyoDRs: true } },
    },
  });

  // Apply chart-level filters
  let chartProjects = allProjectsBase;
  if (filterPicId) chartProjects = chartProjects.filter((p) => p.picId === filterPicId);
  if (filterCustomer) chartProjects = chartProjects.filter((p) => p.customer === filterCustomer);
  if (filterProjectId) chartProjects = chartProjects.filter((p) => p.id === filterProjectId);

  // ─── KPI (always unfiltered — full picture) ──────────────────────────────────
  const totalAktif = allProjectsBase.filter((p) => p.status === "DALAM_PROSES").length;
  const totalTerlambat = allProjectsBase.filter((p) => p.status === "TERLAMBAT").length;

  const totalHinanhyoPending = await db.hinanhyoDR.count({
    where: {
      status: "PENDING",
      ...(session.user.role === "BAWAHAN" ? { project: { picId: session.user.id } } : {}),
    },
  });

  const activeProjects = allProjectsBase.filter((p) => p.status === "DALAM_PROSES");
  const rataRataProgress =
    activeProjects.length > 0
      ? Math.round(activeProjects.reduce((s, p) => s + p.overallProgress, 0) / activeProjects.length)
      : 0;

  const selesaiBulanIni = allProjectsBase.filter(
    (p) =>
      p.status === "SELESAI" &&
      new Date(p.updatedAt) >= startOfMonth &&
      new Date(p.updatedAt) <= endOfMonth,
  ).length;

  const deadline7Hari = allProjectsBase.filter((p) => {
    const end = new Date(p.endDate);
    return end >= now && end <= in7Days && p.status !== "SELESAI";
  }).length;

  // ─── Alerts (unfiltered) ─────────────────────────────────────────────────────
  const alerts: Array<{
    level: "KRITIS" | "PERINGATAN" | "INFO";
    message: string;
    projectCode?: string;
    details?: { code: string; name: string; daysLate: number }[];
  }> = [];

  const terlambatProjects = allProjectsBase
    .filter((p) => p.status === "TERLAMBAT")
    .map((p) => ({
      ...p,
      daysLate: Math.ceil((now.getTime() - new Date(p.endDate).getTime()) / (1000 * 60 * 60 * 24)),
    }))
    .sort((a, b) => b.daysLate - a.daysLate);

  if (terlambatProjects.length === 1) {
    alerts.push({
      level: "KRITIS",
      message: `${terlambatProjects[0].code} - ${terlambatProjects[0].name} melewati deadline ${terlambatProjects[0].daysLate} hari`,
      projectCode: terlambatProjects[0].code,
      details: terlambatProjects.map((p) => ({ code: p.code, name: p.name, daysLate: p.daysLate })),
    });
  } else if (terlambatProjects.length > 1) {
    alerts.push({
      level: "KRITIS",
      message: `${terlambatProjects.length} proyek melewati deadline`,
      details: terlambatProjects.map((p) => ({ code: p.code, name: p.name, daysLate: p.daysLate })),
    });
  }

  for (const p of allProjectsBase.filter((p) => {
    const end = new Date(p.endDate);
    return end >= now && end <= in7Days && p.status !== "SELESAI";
  })) {
    const days = Math.ceil((new Date(p.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    alerts.push({
      level: "PERINGATAN",
      message: `${p.code} akan berakhir dalam ${days} hari (${new Date(p.endDate).toLocaleDateString("id-ID")})`,
      projectCode: p.code,
    });
  }

  const oldPending = await db.hinanhyoDR.count({
    where: {
      status: "PENDING",
      createdAt: { lt: twoWeeksAgo },
      ...(session.user.role === "BAWAHAN" ? { project: { picId: session.user.id } } : {}),
    },
  });
  if (oldPending > 0) {
    alerts.push({ level: "PERINGATAN", message: `${oldPending} item Hinanhyo/DR sudah pending lebih dari 14 hari` });
  }

  for (const p of activeProjects) {
    const total = new Date(p.endDate).getTime() - new Date(p.startDate).getTime();
    const elapsed = now.getTime() - new Date(p.startDate).getTime();
    const timePercent = total > 0 ? (elapsed / total) * 100 : 0;
    if (timePercent >= 50 && p.overallProgress < 30) {
      alerts.push({
        level: "PERINGATAN",
        message: `${p.code} progress ${p.overallProgress}% padahal sudah melewati ${Math.round(timePercent)}% durasi`,
        projectCode: p.code,
      });
    }
  }

  const proyekBaruMingguIni = allProjectsBase.filter((p) => new Date(p.createdAt) >= oneWeekAgo).length;
  if (proyekBaruMingguIni > 0) {
    alerts.push({ level: "INFO", message: `${proyekBaruMingguIni} proyek baru ditambahkan minggu ini` });
  }

  for (const p of allProjectsBase.filter((p) => p.aktualMp && p.aktualMp > p.kebutuhanMp * 1.2)) {
    const pct = Math.round(((p.aktualMp! - p.kebutuhanMp) / p.kebutuhanMp) * 100);
    alerts.push({ level: "INFO", message: `${p.code} kelebihan tenaga kerja ${pct}% dari rencana`, projectCode: p.code });
  }

  // ─── Charts (filtered by chartProjects) ──────────────────────────────────────

  // 1. Status distribution with project list per status
  const statusDist = ["BELUM_MULAI", "DALAM_PROSES", "SELESAI", "TERLAMBAT", "TUNDA"].map((s) => {
    const ps = chartProjects.filter((p) => p.status === s);
    return {
      status: s,
      count: ps.length,
      projects: ps.map((p) => ({ code: p.code, name: p.name })),
    };
  });

  // 2. Phase distribution — count of projects per currentFase with project list
  const phaseDist = ["RFQ", "DIE_GO", "EVENT_PROJECT", "MASS_PRO"].map((f) => {
    const ps = chartProjects.filter((p) => p.currentFase === f);
    return {
      faseKey: f,
      count: ps.length,
      projects: ps.map((p) => ({ code: p.code, name: p.name })),
    };
  });

  // 3. Hinanhyo by project for stacked bar
  const allHinanhyo = await db.hinanhyoDR.findMany({
    where: {
      projectId: { in: chartProjects.map((p) => p.id) },
    },
    select: { status: true, projectId: true },
  });

  const hinanhyoByProject = chartProjects
    .map((p) => {
      const hs = allHinanhyo.filter((h) => h.projectId === p.id);
      return {
        code: p.code,
        name: p.name,
        DITERIMA: hs.filter((h) => h.status === "DITERIMA").length,
        DITOLAK: hs.filter((h) => h.status === "DITOLAK").length,
        PENDING: hs.filter((h) => h.status === "PENDING").length,
        total: hs.length,
      };
    })
    .filter((p) => p.total > 0);

  // 4. MP chart
  const mpChart = chartProjects.map((p) => ({
    code: p.code,
    name: p.name,
    kebutuhan: p.kebutuhanMp,
    aktual: p.aktualMp ?? 0,
  }));

  // 5. Cycle time chart
  const ctChart = chartProjects
    .filter((p) => p.cycleTimeAktual !== null)
    .map((p) => ({
      code: p.code,
      name: p.name,
      target: p.cycleTimeTarget,
      aktual: p.cycleTimeAktual,
    }));

  // ─── Filter options (from unfiltered base) ────────────────────────────────────
  const filterOptions = {
    pics: Array.from(
      new Map(allProjectsBase.map((p) => [p.picId, { id: p.picId, name: p.pic.name }])).values(),
    ),
    customers: [...new Set(allProjectsBase.map((p) => p.customer))].sort(),
    projects: allProjectsBase.map((p) => ({ id: p.id, code: p.code, name: p.name })),
  };

  // ─── Task monitoring table (filtered) ────────────────────────────────────────
  const taskMonitoring = chartProjects.map((p) => {
    const endDate = new Date(p.endDate);
    const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return {
      code: p.code,
      name: p.name,
      picName: p.pic.name,
      customer: p.customer,
      endDate: p.endDate,
      daysRemaining,
      status: p.status,
      overallProgress: p.overallProgress,
    };
  });

  return Response.json({
    kpi: { totalAktif, totalTerlambat, totalHinanhyoPending, rataRataProgress, selesaiBulanIni, deadline7Hari },
    alerts,
    charts: { statusDist, phaseDist, hinanhyoByProject, mpChart, ctChart },
    taskMonitoring,
    filterOptions,
  });
}
