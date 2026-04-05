import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  const fase = searchParams.get("fase");
  const picId = searchParams.get("picId");
  const search = searchParams.get("search");

  const where: Record<string, unknown> = {};

  // Bawahan hanya melihat proyek miliknya
  if (session.user.role === "BAWAHAN") {
    where.picId = session.user.id;
  }

  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (fase) where.currentFase = fase;
  if (picId && session.user.role === "ATASAN") where.picId = picId;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { customer: { contains: search, mode: "insensitive" } },
      { code: { contains: search, mode: "insensitive" } },
    ];
  }

  // Auto-update status TERLAMBAT untuk proyek yang melewati deadline
  await db.project.updateMany({
    where: {
      endDate: { lt: new Date() },
      status: { notIn: ["SELESAI", "TERLAMBAT", "TUNDA"] },
    },
    data: { status: "TERLAMBAT" },
  });

  const projects = await db.project.findMany({
    where,
    include: {
      pic: {
        select: { id: true, name: true, email: true, role: true, department: true, createdAt: true },
      },
      _count: { select: { hinanhyoDRs: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(projects);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ATASAN")
    return Response.json({ error: "Hanya Atasan yang dapat membuat proyek" }, { status: 403 });

  const body = await req.json();
  const { name, description, customer, picId, priority, startDate, endDate, kebutuhanMp, cycleTimeTarget, code: customCode } = body;

  if (!name || !customer || !picId || !startDate || !endDate || !kebutuhanMp || !cycleTimeTarget) {
    return Response.json({ error: "Field wajib tidak lengkap" }, { status: 400 });
  }

  // Kode custom atau auto-generate
  let code: string;
  if (customCode && customCode.trim()) {
    code = customCode.trim().toUpperCase();
    if (!/^[A-Z0-9][A-Z0-9\-]{1,19}$/.test(code)) {
      return Response.json(
        { error: "Format kode tidak valid. Gunakan huruf kapital, angka, dan tanda hubung (contoh: PRJ-009)" },
        { status: 400 }
      );
    }
    const existing = await db.project.findUnique({ where: { code } });
    if (existing) {
      return Response.json({ error: `Kode proyek "${code}" sudah digunakan` }, { status: 409 });
    }
  } else {
    const count = await db.project.count();
    code = `PRJ-${String(count + 1).padStart(3, "0")}`;
  }

  const project = await db.project.create({
    data: {
      code,
      name,
      description: description || null,
      customer,
      picId,
      priority: priority || "MEDIUM",
      status: "BELUM_MULAI",
      currentFase: "RFQ",
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      kebutuhanMp: parseInt(kebutuhanMp),
      cycleTimeTarget: parseInt(cycleTimeTarget),
    },
    include: {
      pic: { select: { id: true, name: true, email: true, role: true, department: true, createdAt: true } },
    },
  });

  await db.activityLog.create({
    data: {
      projectId: project.id,
      userId: session.user.id,
      action: "Buat Proyek",
      detail: `Proyek ${code} - ${name} dibuat`,
    },
  });

  return Response.json(project, { status: 201 });
}
