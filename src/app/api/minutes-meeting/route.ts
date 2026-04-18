import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const search = searchParams.get("search");

  const where: Record<string, unknown> = {};
  if (projectId) where.projectId = projectId;
  if (search) {
    where.OR = [
      { deskripsi: { contains: search, mode: "insensitive" } },
      { informasiUntuk: { contains: search, mode: "insensitive" } },
    ];
  }

  const items = await db.minuteMeeting.findMany({
    where,
    include: {
      project: { select: { id: true, assNumber: true, assName: true, customer: true } },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: { recordingDate: "desc" },
  });

  return Response.json(items);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { recordingDate, projectId, informasiUntuk, departemen, deskripsi, followUpDate } = body;

  if (!recordingDate || !deskripsi) {
    return Response.json({ error: "recordingDate and deskripsi are required" }, { status: 400 });
  }

  const item = await db.minuteMeeting.create({
    data: {
      recordingDate: new Date(recordingDate),
      projectId: projectId || null,
      informasiUntuk: informasiUntuk || null,
      departemen: departemen || null,
      deskripsi,
      followUpDate: followUpDate ? new Date(followUpDate) : null,
      createdById: session.user.id,
    },
    include: {
      project: { select: { id: true, assNumber: true, assName: true, customer: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  return Response.json(item, { status: 201 });
}
