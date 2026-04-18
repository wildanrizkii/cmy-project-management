import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";
// import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from "@/lib/gcal"; // disabled: uses personal refresh token

const USER_SELECT = { id: true, name: true, email: true, role: true, department: true, createdAt: true };

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const subFase = await db.subFase.findUnique({
    where: { id },
    include: { projectFase: { select: { fase: true } } },
  });
  if (!subFase) return Response.json({ error: "SubPhase not found" }, { status: 404 });

  const body = await req.json();
  const {
    name, description, picId,
    customerStartDate, customerTargetDate,
    picStartDate, picTargetDate,
    documentUrl, isDone,
  } = body;

  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (picId !== undefined) updateData.picId = picId;
  if (customerStartDate !== undefined) updateData.customerStartDate = customerStartDate ? new Date(customerStartDate) : null;
  if (customerTargetDate !== undefined) updateData.customerTargetDate = customerTargetDate ? new Date(customerTargetDate) : null;
  if (picStartDate !== undefined) updateData.picStartDate = picStartDate ? new Date(picStartDate) : null;
  if (picTargetDate !== undefined) updateData.picTargetDate = picTargetDate ? new Date(picTargetDate) : null;
  if (documentUrl !== undefined) updateData.documentUrl = documentUrl;
  if (isDone !== undefined) updateData.isDone = isDone;

  const updated = await db.subFase.update({
    where: { id },
    data: updateData,
    include: { pic: { select: USER_SELECT } },
  });

  // Google Calendar sync disabled (uses personal refresh token)
  // if (newPicTarget) { ... updateCalendarEvent / createCalendarEvent ... }

  if (isDone !== undefined) {
    await db.activityLog.create({
      data: {
        projectId: subFase.projectId,
        userId: session.user.id,
        action: isDone ? "SubPhase Completed" : "SubPhase Reopened",
        detail: `SubPhase "${subFase.name}" marked as ${isDone ? "done" : "not done"}`,
      },
    });
  }

  return Response.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const subFase = await db.subFase.findUnique({ where: { id } });
  if (!subFase) return Response.json({ error: "SubPhase not found" }, { status: 404 });

  // Google Calendar delete disabled (uses personal refresh token)
  // if (subFase.gcalEventId) { ... deleteCalendarEvent ... }

  await db.subFase.delete({ where: { id } });

  await db.activityLog.create({
    data: {
      projectId: subFase.projectId,
      userId: session.user.id,
      action: "SubPhase Deleted",
      detail: `Deleted SubPhase: ${subFase.name}`,
    },
  });

  return Response.json({ message: "SubPhase deleted" });
}
