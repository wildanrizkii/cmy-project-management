import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";

const USER_SELECT = { id: true, name: true, email: true, role: true, department: true, createdAt: true };

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  const fase = searchParams.get("fase");
  const leaderId = searchParams.get("leaderId");
  const search = searchParams.get("search");

  const where: Record<string, unknown> = {};

  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (fase) where.currentFase = fase;
  if (leaderId) where.projectLeaderId = leaderId;
  if (search) {
    where.OR = [
      { assName: { contains: search, mode: "insensitive" } },
      { assNumber: { contains: search, mode: "insensitive" } },
      { customer: { contains: search, mode: "insensitive" } },
      { model: { contains: search, mode: "insensitive" } },
    ];
  }

  // Auto-update status to TERLAMBAT for projects past their targetDate
  await db.project.updateMany({
    where: {
      targetDate: { lt: new Date() },
      status: { notIn: ["SELESAI", "TERLAMBAT", "TUNDA"] },
    },
    data: { status: "TERLAMBAT" },
  });

  const projects = await db.project.findMany({
    where,
    include: {
      projectLeader: { select: USER_SELECT },
      fases: {
        include: { subFases: { include: { pic: { select: USER_SELECT } } } },
        orderBy: { fase: "asc" },
      },
      _count: { select: { hinanhyoDRs: { where: { status: "PENDING" } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(projects);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { model, assName, assNumber: customAssNumber, customer, description, projectLeaderId, priority, startDate, targetDate, kebutuhanMp } = body;

  if (!model || !assName || !customer || !projectLeaderId || !startDate || !targetDate || !kebutuhanMp) {
    return Response.json({ error: "Required fields are missing" }, { status: 400 });
  }

  // Custom or auto-generate assNumber
  let assNumber: string;
  if (customAssNumber && customAssNumber.trim()) {
    assNumber = customAssNumber.trim().toUpperCase();
    const existing = await db.project.findUnique({ where: { assNumber } });
    if (existing) {
      return Response.json({ error: `Assy Number "${assNumber}" is already in use` }, { status: 409 });
    }
  } else {
    const count = await db.project.count();
    assNumber = `ASS-${String(count + 1).padStart(3, "0")}`;
  }

  const project = await db.project.create({
    data: {
      model,
      assNumber,
      assName,
      description: description || null,
      customer,
      projectLeaderId,
      priority: priority || "MEDIUM",
      status: "BELUM_MULAI",
      currentFase: "RFQ",
      startDate: new Date(startDate),
      targetDate: new Date(targetDate),
      kebutuhanMp: parseInt(kebutuhanMp),
    },
    include: {
      projectLeader: { select: USER_SELECT },
    },
  });

  // Auto-create 4 phase records
  await db.projectFase.createMany({
    data: [
      { projectId: project.id, fase: "RFQ" },
      { projectId: project.id, fase: "DIE_GO" },
      { projectId: project.id, fase: "EVENT_PROJECT" },
      { projectId: project.id, fase: "MASS_PRO" },
    ],
  });

  await db.activityLog.create({
    data: {
      projectId: project.id,
      userId: session.user.id,
      action: "Project Created",
      detail: `Project ${assNumber} - ${assName} created`,
    },
  });

  return Response.json(project, { status: 201 });
}
