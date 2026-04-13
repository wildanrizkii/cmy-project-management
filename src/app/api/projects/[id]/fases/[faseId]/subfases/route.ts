import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";
import { createCalendarEvent, sendSubFaseEmail } from "@/lib/gcal";

const USER_SELECT = { id: true, name: true, email: true, role: true, department: true, createdAt: true };

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; faseId: string }> }
) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: projectId, faseId } = await params;

  const fase = await db.projectFase.findUnique({ where: { id: faseId } });
  if (!fase || fase.projectId !== projectId) {
    return Response.json({ error: "Phase not found" }, { status: 404 });
  }

  const body = await req.json();
  const { name, description, picId, customerStartDate, customerTargetDate, picStartDate, picTargetDate, documentUrl } = body;

  if (!name || !picId) {
    return Response.json({ error: "Name and PIC are required" }, { status: 400 });
  }

  const project = await db.project.findUnique({ where: { id: projectId }, select: { assNumber: true, assName: true } });
  const pic = await db.user.findUnique({ where: { id: picId }, select: { name: true, email: true } });

  const subFase = await db.subFase.create({
    data: {
      projectFaseId: faseId,
      projectId,
      name,
      description: description || null,
      picId,
      customerStartDate: customerStartDate ? new Date(customerStartDate) : null,
      customerTargetDate: customerTargetDate ? new Date(customerTargetDate) : null,
      picStartDate: picStartDate ? new Date(picStartDate) : null,
      picTargetDate: picTargetDate ? new Date(picTargetDate) : null,
      documentUrl: documentUrl || null,
    },
    include: { pic: { select: USER_SELECT } },
  });

  // Sync to Google Calendar if picTargetDate exists
  if (picTargetDate) {
    try {
      const startIso = picStartDate || picTargetDate;
      const gcalEventId = await createCalendarEvent({
        summary: `[${project?.assNumber}] ${name}`,
        description: `Project: ${project?.assName}\nPIC: ${pic?.name}\nPhase: ${fase.fase}${description ? `\n\n${description}` : ""}`,
        startDate: startIso,
        endDate: picTargetDate,
        attendeeEmail: pic?.email ?? undefined,
      });
      if (gcalEventId) {
        await db.subFase.update({ where: { id: subFase.id }, data: { gcalEventId } });
        subFase.gcalEventId = gcalEventId;
      }
    } catch (e) {
      console.error("GCal sync error (create):", e);
      (subFase as Record<string, unknown>)._gcalError = e instanceof Error ? e.message : String(e);
    }
  }

  // Send immediate email to PIC
  try {
    if (pic?.email) {
      await sendSubFaseEmail({
        to: pic.email,
        picName: pic.name,
        subFaseName: name,
        projectCode: project?.assNumber ?? projectId,
        projectName: project?.assName ?? "",
        fase: fase.fase,
        picStartDate: picStartDate ?? null,
        picTargetDate: picTargetDate ?? null,
        customerTargetDate: customerTargetDate ?? null,
        documentUrl: documentUrl ?? null,
        description: description ?? null,
      });
    }
  } catch (e) {
    console.error("Email send error:", e);
  }

  try {
    await db.activityLog.create({
      data: {
        projectId,
        userId: session.user.id,
        action: "SubPhase Added",
        detail: `Added SubPhase: ${name} to ${fase.fase}`,
      },
    });
  } catch (e) {
    console.error("ActivityLog error:", e);
  }

  return Response.json(subFase, { status: 201 });
}
