import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from "@/lib/gcal";

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

  // Sync to Google Calendar
  const newPicTarget = picTargetDate !== undefined ? picTargetDate : subFase.picTargetDate?.toISOString();
  const newPicStart = picStartDate !== undefined ? picStartDate : subFase.picStartDate?.toISOString();
  const effectiveName = name ?? subFase.name;

  if (newPicTarget) {
    try {
      const project = await db.project.findUnique({
        where: { id: subFase.projectId },
        select: { assNumber: true, assName: true },
      });
      const pic = await db.user.findUnique({ where: { id: updated.picId }, select: { name: true } });
      const payload = {
        summary: `[${project?.assNumber}] ${effectiveName}`,
        description: `Project: ${project?.assName}\nPIC: ${pic?.name}\nPhase: ${subFase.projectFase.fase}`,
        startDate: newPicStart || newPicTarget,
        endDate: newPicTarget,
      };

      if (subFase.gcalEventId) {
        await updateCalendarEvent(subFase.gcalEventId, payload);
      } else {
        const gcalEventId = await createCalendarEvent(payload);
        if (gcalEventId) {
          await db.subFase.update({ where: { id }, data: { gcalEventId } });
        }
      }
    } catch (e) {
      console.error("GCal sync error (update):", e);
    }
  }

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

  // Delete from Google Calendar first
  if (subFase.gcalEventId) {
    try {
      await deleteCalendarEvent(subFase.gcalEventId);
    } catch (e) {
      console.error("GCal sync error (delete):", e);
    }
  }

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
