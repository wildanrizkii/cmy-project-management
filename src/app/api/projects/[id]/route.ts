import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";
import { calculateOverallProgress } from "@/lib/utils";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const project = await db.project.findUnique({
    where: { id },
    include: {
      pic: { select: { id: true, name: true, email: true, role: true, department: true, createdAt: true } },
      hinanhyoDRs: {
        include: { pic: { select: { id: true, name: true, email: true, role: true, department: true, createdAt: true } } },
        orderBy: { createdAt: "desc" },
      },
      activityLogs: {
        include: { user: { select: { id: true, name: true, email: true, role: true, department: true, createdAt: true } } },
        orderBy: { createdAt: "desc" },
      },
      _count: { select: { hinanhyoDRs: true } },
    },
  });

  if (!project) return Response.json({ error: "Proyek tidak ditemukan" }, { status: 404 });

  // Bawahan hanya bisa lihat proyek miliknya
  if (session.user.role === "BAWAHAN" && project.picId !== session.user.id) {
    return Response.json({ error: "Tidak memiliki akses" }, { status: 403 });
  }

  return Response.json(project);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const project = await db.project.findUnique({ where: { id } });
  if (!project) return Response.json({ error: "Proyek tidak ditemukan" }, { status: 404 });

  // Bawahan hanya bisa edit proyek miliknya
  if (session.user.role === "BAWAHAN" && project.picId !== session.user.id) {
    return Response.json({ error: "Tidak memiliki akses" }, { status: 403 });
  }

  const body = await req.json();
  const {
    name, description, customer, picId, priority, status, currentFase,
    startDate, endDate, kebutuhanMp, aktualMp, cycleTimeTarget, cycleTimeAktual,
    rfqProgress, dieGoProgress, eventProjectProgress, massProProgress,
  } = body;

  // Bawahan tidak bisa ubah PIC
  const updateData: Record<string, unknown> = {};
  if (name !== undefined && session.user.role === "ATASAN") updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (customer !== undefined && session.user.role === "ATASAN") updateData.customer = customer;
  if (picId !== undefined && session.user.role === "ATASAN") updateData.picId = picId;
  if (priority !== undefined && session.user.role === "ATASAN") updateData.priority = priority;
  if (status !== undefined) updateData.status = status;
  if (currentFase !== undefined) updateData.currentFase = currentFase;
  if (startDate !== undefined && session.user.role === "ATASAN") updateData.startDate = new Date(startDate);
  if (endDate !== undefined && session.user.role === "ATASAN") updateData.endDate = new Date(endDate);
  if (kebutuhanMp !== undefined && session.user.role === "ATASAN") updateData.kebutuhanMp = parseInt(kebutuhanMp);
  if (aktualMp !== undefined) updateData.aktualMp = parseInt(aktualMp);
  if (cycleTimeTarget !== undefined && session.user.role === "ATASAN") updateData.cycleTimeTarget = parseInt(cycleTimeTarget);
  if (cycleTimeAktual !== undefined) updateData.cycleTimeAktual = cycleTimeAktual ? parseInt(cycleTimeAktual) : null;

  // Update phase progress
  let newRfq = project.rfqProgress;
  let newDieGo = project.dieGoProgress;
  let newEventProject = project.eventProjectProgress;
  let newMassPro = project.massProProgress;

  if (rfqProgress !== undefined) { newRfq = parseInt(rfqProgress); updateData.rfqProgress = newRfq; }
  if (dieGoProgress !== undefined) { newDieGo = parseInt(dieGoProgress); updateData.dieGoProgress = newDieGo; }
  if (eventProjectProgress !== undefined) { newEventProject = parseInt(eventProjectProgress); updateData.eventProjectProgress = newEventProject; }
  if (massProProgress !== undefined) { newMassPro = parseInt(massProProgress); updateData.massProProgress = newMassPro; }

  // Recalculate overall progress
  if (rfqProgress !== undefined || dieGoProgress !== undefined || eventProjectProgress !== undefined || massProProgress !== undefined) {
    updateData.overallProgress = calculateOverallProgress(newRfq, newDieGo, newEventProject, newMassPro);
  }

  const updated = await db.project.update({
    where: { id },
    data: updateData,
    include: {
      pic: { select: { id: true, name: true, email: true, role: true, department: true, createdAt: true } },
      _count: { select: { hinanhyoDRs: true } },
    },
  });

  // Log activity
  const changedFields = Object.keys(updateData).join(", ");
  await db.activityLog.create({
    data: {
      projectId: id,
      userId: session.user.id,
      action: "Update Proyek",
      detail: `Field diupdate: ${changedFields}`,
    },
  });

  return Response.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ATASAN")
    return Response.json({ error: "Hanya Atasan yang dapat menghapus proyek" }, { status: 403 });

  const { id } = await params;

  const project = await db.project.findUnique({ where: { id } });
  if (!project) return Response.json({ error: "Proyek tidak ditemukan" }, { status: 404 });

  await db.project.delete({ where: { id } });

  return Response.json({ message: "Proyek berhasil dihapus" });
}
