import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";

const USER_SELECT = { id: true, name: true, email: true, role: true, department: true, createdAt: true };

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
      projectLeader: { select: USER_SELECT },
      fases: {
        include: {
          subFases: {
            where: { parentSubFaseId: null },
            include: {
              pic: { select: USER_SELECT },
              children: {
                include: { pic: { select: USER_SELECT } },
                orderBy: { createdAt: "asc" },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { fase: "asc" },
      },
      hinanhyoDRs: {
        include: {
          subFase: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      activityLogs: {
        include: { user: { select: USER_SELECT } },
        orderBy: { createdAt: "desc" },
      },
      _count: { select: { hinanhyoDRs: true } },
    },
  });

  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

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
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  const body = await req.json();
  const {
    model, assName, assNumber, customer, description, projectLeaderId,
    priority, status, currentFase, startDate, targetDate, kebutuhanMp, aktualMp,
    targetCt, aktualCt,
  } = body;

  const updateData: Record<string, unknown> = {};
  if (model !== undefined) updateData.model = model;
  if (assName !== undefined) updateData.assName = assName;
  if (assNumber !== undefined) updateData.assNumber = assNumber;
  if (customer !== undefined) updateData.customer = customer;
  if (description !== undefined) updateData.description = description;
  if (projectLeaderId !== undefined) updateData.projectLeaderId = projectLeaderId;
  if (priority !== undefined) updateData.priority = priority;
  if (status !== undefined) updateData.status = status;
  if (currentFase !== undefined) updateData.currentFase = currentFase;
  if (startDate !== undefined) updateData.startDate = new Date(startDate);
  if (targetDate !== undefined) updateData.targetDate = new Date(targetDate);
  if (kebutuhanMp !== undefined) updateData.kebutuhanMp = parseInt(kebutuhanMp);
  if (aktualMp !== undefined) updateData.aktualMp = aktualMp ? parseInt(aktualMp) : null;
  if (targetCt !== undefined) updateData.targetCt = targetCt !== null ? parseFloat(targetCt) : null;
  if (aktualCt !== undefined) updateData.aktualCt = aktualCt;

  const updated = await db.project.update({
    where: { id },
    data: updateData,
    include: {
      projectLeader: { select: USER_SELECT },
      fases: {
        include: {
          subFases: {
            where: { parentSubFaseId: null },
            include: {
              pic: { select: USER_SELECT },
              children: { include: { pic: { select: USER_SELECT } }, orderBy: { createdAt: "asc" } },
            },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { fase: "asc" },
      },
      _count: { select: { hinanhyoDRs: true } },
    },
  });

  const changedFields = Object.keys(updateData).join(", ");
  await db.activityLog.create({
    data: {
      projectId: id,
      userId: session.user.id,
      action: "Project Updated",
      detail: `Fields updated: ${changedFields}`,
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

  const { id } = await params;

  const project = await db.project.findUnique({ where: { id } });
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  await db.project.delete({ where: { id } });

  return Response.json({ message: "Project deleted successfully" });
}
