import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const baseWhere = session.user.role === "BAWAHAN" ? { picId: session.user.id } : {};

  // All projects
  const allProjects = await db.project.findMany({
    where: baseWhere,
    include: {
      pic: { select: { id: true, name: true, email: true, role: true, department: true, createdAt: true } },
      _count: { select: { hinanhyoDRs: true } },
    },
  });

  // KPI: Total proyek aktif
  const totalAktif = allProjects.filter((p) => p.status === "DALAM_PROSES").length;

  // KPI: Proyek terlambat
  const totalTerlambat = allProjects.filter((p) => p.status === "TERLAMBAT").length;

  // KPI: Total Hinanhyo/DR Pending
  const totalHinanhyoPending = await db.hinanhyoDR.count({
    where: {
      status: "PENDING",
      ...(session.user.role === "BAWAHAN"
        ? { project: { picId: session.user.id } }
        : {}),
    },
  });

  // KPI: Rata-rata progress proyek aktif
  const activeProjects = allProjects.filter((p) => p.status === "DALAM_PROSES");
  const rataRataProgress =
    activeProjects.length > 0
      ? Math.round(activeProjects.reduce((sum, p) => sum + p.overallProgress, 0) / activeProjects.length)
      : 0;

  // KPI: Proyek selesai bulan ini
  const selesaiBulanIni = allProjects.filter(
    (p) =>
      p.status === "SELESAI" &&
      new Date(p.updatedAt) >= startOfMonth &&
      new Date(p.updatedAt) <= endOfMonth
  ).length;

  // KPI: Proyek deadline dalam 7 hari
  const deadline7Hari = allProjects.filter((p) => {
    const end = new Date(p.endDate);
    return end >= now && end <= in7Days && p.status !== "SELESAI";
  }).length;

  // Alerts
  const alerts: Array<{
    level: "KRITIS" | "PERINGATAN" | "INFO";
    message: string;
    projectCode?: string;
    details?: { code: string; name: string; daysLate: number }[];
  }> = [];

  // KRITIS: Proyek terlambat — grouped, max 3 ditampilkan individual
  const terlambatProjects = allProjects
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

  // PERINGATAN: Deadline <= 7 hari
  for (const p of allProjects.filter((p) => {
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

  // PERINGATAN: Hinanhyo/DR Pending > 2 minggu
  const oldPending = await db.hinanhyoDR.count({
    where: {
      status: "PENDING",
      createdAt: { lt: twoWeeksAgo },
      ...(session.user.role === "BAWAHAN" ? { project: { picId: session.user.id } } : {}),
    },
  });
  if (oldPending > 0) {
    alerts.push({
      level: "PERINGATAN",
      message: `${oldPending} item Hinanhyo/DR sudah pending lebih dari 14 hari`,
    });
  }

  // PERINGATAN: Progress lambat (<30% dalam 50% waktu)
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

  // INFO: Proyek baru minggu ini
  const proyekBaruMingguIni = allProjects.filter(
    (p) => new Date(p.createdAt) >= oneWeekAgo
  ).length;
  if (proyekBaruMingguIni > 0) {
    alerts.push({
      level: "INFO",
      message: `${proyekBaruMingguIni} proyek baru ditambahkan minggu ini`,
    });
  }

  // INFO: Aktual MP > Kebutuhan MP > 20%
  for (const p of allProjects.filter(
    (p) => p.aktualMp && p.aktualMp > p.kebutuhanMp * 1.2
  )) {
    const pct = Math.round(((p.aktualMp! - p.kebutuhanMp) / p.kebutuhanMp) * 100);
    alerts.push({
      level: "INFO",
      message: `${p.code} kelebihan tenaga kerja ${pct}% dari rencana`,
      projectCode: p.code,
    });
  }

  // Charts
  // Status distribution
  const statusDist = ["BELUM_MULAI", "DALAM_PROSES", "SELESAI", "TERLAMBAT", "TUNDA"].map((s) => ({
    status: s,
    count: allProjects.filter((p) => p.status === s).length,
  }));

  // Phase progress avg — dari semua proyek yang belum selesai (exclude SELESAI)
  const nonFinishedProjects = allProjects.filter((p) => p.status !== "SELESAI");
  const phaseBase = nonFinishedProjects.length > 0 ? nonFinishedProjects : allProjects;
  const phaseAvg = {
    RFQ: phaseBase.length ? Math.round(phaseBase.reduce((s, p) => s + p.rfqProgress, 0) / phaseBase.length) : 0,
    DIE_GO: phaseBase.length ? Math.round(phaseBase.reduce((s, p) => s + p.dieGoProgress, 0) / phaseBase.length) : 0,
    EVENT_PROJECT: phaseBase.length ? Math.round(phaseBase.reduce((s, p) => s + p.eventProjectProgress, 0) / phaseBase.length) : 0,
    MASS_PRO: phaseBase.length ? Math.round(phaseBase.reduce((s, p) => s + p.massProProgress, 0) / phaseBase.length) : 0,
  };

  // Hinanhyo/DR distribution
  const allHinanhyo = await db.hinanhyoDR.findMany({
    where: session.user.role === "BAWAHAN" ? { project: { picId: session.user.id } } : {},
    select: { status: true, type: true, projectId: true, createdAt: true },
  });

  const hinanhyoDist = {
    DITERIMA: allHinanhyo.filter((h) => h.status === "DITERIMA").length,
    DITOLAK: allHinanhyo.filter((h) => h.status === "DITOLAK").length,
    PENDING: allHinanhyo.filter((h) => h.status === "PENDING").length,
  };

  // MP chart
  const mpChart = allProjects.map((p) => ({
    code: p.code,
    name: p.name,
    kebutuhan: p.kebutuhanMp,
    aktual: p.aktualMp ?? 0,
  }));

  // Cycle time chart (only completed)
  const ctChart = allProjects
    .filter((p) => p.cycleTimeAktual !== null)
    .map((p) => ({
      code: p.code,
      name: p.name,
      target: p.cycleTimeTarget,
      aktual: p.cycleTimeAktual,
    }));

  // Task monitoring table
  const taskMonitoring = allProjects.map((p) => {
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
    kpi: {
      totalAktif,
      totalTerlambat,
      totalHinanhyoPending,
      rataRataProgress,
      selesaiBulanIni,
      deadline7Hari,
    },
    alerts,
    charts: {
      statusDist,
      phaseAvg,
      hinanhyoDist,
      mpChart,
      ctChart,
    },
    taskMonitoring,
    projects: allProjects,
  });
}
