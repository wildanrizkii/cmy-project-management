import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { recordingDate, projectId, informasiUntuk, departemen, deskripsi, followUpDate, isDone } = body;

  const data: Record<string, unknown> = {};
  if (recordingDate !== undefined) data.recordingDate = new Date(recordingDate);
  if (projectId !== undefined) data.projectId = projectId || null;
  if (informasiUntuk !== undefined) data.informasiUntuk = informasiUntuk || null;
  if (departemen !== undefined) data.departemen = departemen || null;
  if (deskripsi !== undefined) data.deskripsi = deskripsi;
  if (followUpDate !== undefined) data.followUpDate = followUpDate ? new Date(followUpDate) : null;
  if (isDone !== undefined) data.isDone = isDone;

  const updated = await db.minuteMeeting.update({
    where: { id },
    data,
    include: {
      project: { select: { id: true, assNumber: true, assName: true, customer: true } },
      createdBy: { select: { id: true, name: true } },
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
  await db.minuteMeeting.delete({ where: { id } });
  return Response.json({ message: "Deleted" });
}
