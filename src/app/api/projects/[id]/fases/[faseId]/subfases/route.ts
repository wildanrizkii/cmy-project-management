import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";
// import { createCalendarEvent, sendSubFaseEmail } from "@/lib/gcal"; // disabled: uses personal refresh token

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
  const { name, description, picId, customerStartDate, customerTargetDate, picStartDate, picTargetDate, documentUrl, parentSubFaseId } = body;

  if (!name || !picId) {
    return Response.json({ error: "Name and PIC are required" }, { status: 400 });
  }

  const project = await db.project.findUnique({ where: { id: projectId }, select: { assNumber: true, assName: true } });
  const pic = await db.user.findUnique({ where: { id: picId }, select: { name: true, email: true } });

  const subFase = await db.subFase.create({
    data: {
      projectFaseId: faseId,
      projectId,
      parentSubFaseId: parentSubFaseId || null,
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

  // Google Calendar sync disabled (uses personal refresh token)
  // if (picTargetDate) { ... createCalendarEvent ... }

  // Email notification disabled (uses personal Gmail token)
  // if (pic?.email) { ... sendSubFaseEmail ... }

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
