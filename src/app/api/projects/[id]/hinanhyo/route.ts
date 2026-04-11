import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const items = await db.hinanhyoDR.findMany({
    where: { projectId: id },
    include: {
      subFase: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(items);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const project = await db.project.findUnique({ where: { id } });
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  const body = await req.json();
  const { type, title, description, status, subFaseId } = body;

  if (!type || !title) {
    return Response.json({ error: "Type and title are required" }, { status: 400 });
  }

  const item = await db.hinanhyoDR.create({
    data: {
      projectId: id,
      type,
      title,
      description: description || null,
      status: status || "PENDING",
      subFaseId: subFaseId || null,
    },
    include: {
      subFase: { select: { id: true, name: true } },
    },
  });

  const typeLabel = type === "HINANHYO" ? "Hinanhyo" : type === "DR" ? "Design Review" : type === "KOMARIGOTO" ? "Komarigoto" : "VA/VE";
  await db.activityLog.create({
    data: {
      projectId: id,
      userId: session.user.id,
      action: `${typeLabel} Added`,
      detail: `Added: ${title}`,
    },
  });

  return Response.json(item, { status: 201 });
}
